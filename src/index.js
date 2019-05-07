import "@babel/polyfill";

const get = (obj, accessor) => accessor.split(".").reduce((o, i) => o[i], obj);

/*
 * sortAlgolia(a: object, b: object, includeGeo: bool)
 *
 * Custom sort method for algolia searches using the default algolia search relevance
 **/
export const sortAlgolia = (a, b, includeGeo = true) => {
  const rankings = [];

  rankings.push({ name: "nbTypos", goal: "lowest" });

  // Only compare geo  if not remote
  if (includeGeo) {
    rankings.push({ name: "geoDistance", goal: "lowest" });
    rankings.push({ name: "geoPrecision", goal: "highest" });
  }

  rankings.push({ name: "firstMatchedWord", goal: "lowest" });
  rankings.push({ name: "words", goal: "highest" });
  rankings.push({ name: "filters", goal: "highest" });
  rankings.push({ name: "proximityDistance", goal: "lowest" });
  rankings.push({ name: "nbExactWords", goal: "highest" });
  rankings.push({ name: "userScore", goal: "highest" });

  for (let index = 0; index < rankings.length; index++) {
    const { name, goal } = rankings[index];

    const score =
      goal === "lowest"
        ? a._rankingInfo[name] - b._rankingInfo[name]
        : b._rankingInfo[name] - a._rankingInfo[name];

    if (score !== 0) {
      return score;
    }
  }

  return 0;
};

/*
 * combinePagination()
 * */
export default ({ getters, sortKey, sort, sortDirection = "desc" }) => {
  let state = {
    pages: getters.map(() => []),
    getNext: {
      data: getters.map(() => []),
      meta: {},
      nextPageForGetters: getters.map(() => 0)
    },
    getNextForGetter: {
      nextPageForGetters: getters.map(() => 0)
    }
  };

  const _getSortKey = hit => get(hit, sortKey);

  const _isAfter = (a, b, { eq = true } = {}) => {
    if (sort) {
      return eq ? sort(a, b) >= 0 : sort(a, b) > 0;
    }

    if (sortDirection === "asc") {
      return eq
        ? _getSortKey(a) >= _getSortKey(b)
        : _getSortKey(a) > _getSortKey(b);
    }

    return eq
      ? _getSortKey(a) <= _getSortKey(b)
      : _getSortKey(a) < _getSortKey(b);
  };

  const _isBefore = (a, b, { eq = true } = {}) => {
    if (sort) {
      return eq ? sort(a, b) <= 0 : sort(a, b) < 0;
    }

    if (sortDirection === "asc") {
      return eq
        ? _getSortKey(a) <= _getSortKey(b)
        : _getSortKey(a) < _getSortKey(b);
    }

    return eq
      ? _getSortKey(a) >= _getSortKey(b)
      : _getSortKey(a) > _getSortKey(b);
  };

  const _sortPage = hits =>
    sort
      ? hits.sort(sort)
      : hits.sort((a, b) => get(b, sortKey) - get(a, sortKey));

  const _mergeData = data =>
    _sortPage(
      data.reduce((acc, hitsForGetter) => [...acc, ...hitsForGetter], [])
    );

  const _trimPage = ({ page, meta }) => {
    const { earliestLastHit, firstHit } = meta;
    // const lastHitForShortestPage = shortestPage[shortestPage.length - 1];

    if (!_isAfter(earliestLastHit, firstHit)) {
      throw new Error(
        "combined-pagination Error. Order of results from data getters does not match sortKey and sortDirection."
      );
    }

    const trimmedPage = page.filter(
      hit => _isAfter(hit, firstHit) && _isBefore(hit, earliestLastHit)
    );

    return trimmedPage;
  };

  const _getMeta = ({ currentMeta, results }) => {
    const lastHitForGetter = results[results.length - 1];
    const {
      earliestLastHit = lastHitForGetter,
      firstHit = results[0]
    } = currentMeta;

    return {
      firstHit: _isBefore(results[0], firstHit, { eq: false })
        ? results[0]
        : firstHit,
      earliestLastHit: _isBefore(lastHitForGetter, earliestLastHit, {
        eq: false
      })
        ? lastHitForGetter
        : earliestLastHit
    };
  };

  const _shouldProcessPage = ({ data, page, getterIndex }) =>
    data[getterIndex].length === 0 && page !== null;

  // NB Not hugely efficient
  const _tidyData = ({ data, trimmedPage }) =>
    data.reduce(
      (acc, getterData) => [
        ...acc,
        getterData.filter(hit => trimmedPage.indexOf(hit) === -1)
      ],
      []
    );

  const _getData = async ({ getterIndex, page, userOptions }) => {
    const getter = getters[getterIndex];
    const cachedPage = state.pages[getterIndex][page];

    let results;

    if (cachedPage) {
      results = cachedPage;
    } else {
      results = await getter(page, userOptions);
      state.pages[getterIndex].push(results);
    }

    return results;
  };

  const getNext = async userOptions => {
    // We recalculate these meta params on each page
    state.getNext.meta.firstHit = undefined;
    state.getNext.meta.earliestLastHit = undefined;

    for (let getterIndex = 0; getterIndex < getters.length; getterIndex++) {
      const page = state.getNext.nextPageForGetters[getterIndex];

      if (
        _shouldProcessPage({
          data: state.getNext.data,
          page,
          getterIndex
        })
      ) {
        const results = await _getData({
          getterIndex,
          page,
          userOptions
        });

        if (results.length > 0) {
          state.getNext.data[getterIndex] = results;
          state.getNext.nextPageForGetters[getterIndex] = page + 1;
          state.getNext.meta = _getMeta({
            currentMeta: state.getNext.meta,
            getterIndex,
            results
          });
        } else {
          state.getNext.nextPageForGetters[getterIndex] = null;
        }
      } else {
        if (state.getNext.data[getterIndex].length > 0) {
          state.getNext.meta = _getMeta({
            currentMeta: state.getNext.meta,
            getterIndex,
            results: state.getNext.data[getterIndex]
          });
        }
      }
    }

    const page = _mergeData(state.getNext.data);

    const trimmedPage =
      page.length > 0
        ? _trimPage({
            page,
            meta: state.getNext.meta
          })
        : page;

    state.getNext.data = _tidyData({ data: state.getNext.data, trimmedPage });

    return trimmedPage;
  };

  const getNextForGetter = async (getterIndex, userOptions) => {
    const page = state.getNextForGetter.nextPageForGetters[getterIndex];

    if (page === null) {
      return [];
    }

    const results = await _getData({
      getterIndex,
      page,
      userOptions
    });

    if (results.length === 0) {
      state.getNextForGetter.nextPageForGetters[getterIndex] = null;
    } else {
      state.getNextForGetter.nextPageForGetters[getterIndex] = page + 1;
    }

    return results;
  };

  const extractState = () => {
    return state;
  };

  const injectState = async injectedState => {
    state = injectedState;
  };

  return {
    getNext,
    getNextForGetter,
    extractState,
    injectState
  };
};
