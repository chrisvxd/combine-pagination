import "@babel/polyfill";

/*
 * combinePagination()
 * */
export default ({ getters, sortKey, sortDirection = "desc" }) => {
  const state = {
    data: getters.map(() => []),
    nextPageForGetters: getters.map(() => 0),
    meta: {}
  };

  const _getSortKey = hit => hit[sortKey];

  const _isAfter = (a, b, { eq = true } = {}) => {
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
    if (sortDirection === "asc") {
      return eq
        ? _getSortKey(a) <= _getSortKey(b)
        : _getSortKey(a) < _getSortKey(b);
    }

    return eq
      ? _getSortKey(a) >= _getSortKey(b)
      : _getSortKey(a) > _getSortKey(b);
  };

  const _sortPage = hits => hits.sort((a, b) => b[sortKey] - a[sortKey]);

  const _mergeData = data =>
    _sortPage(
      data.reduce((acc, hitsForGetter) => [...acc, ...hitsForGetter], [])
    );

  const _trimPage = ({ page, meta }) => {
    const { earliestLastHit, firstHit } = meta;
    // const lastHitForShortestPage = shortestPage[shortestPage.length - 1];

    const trimmedPage = page.filter(
      hit => _isAfter(hit, firstHit) && _isBefore(hit, earliestLastHit)
    );

    return trimmedPage;
  };

  const _getMeta = ({ currentMeta, results }) => {
    const { earliestLastHit, firstHit } = currentMeta;
    const lastHitForGetter = results[results.length - 1];

    return {
      firstHit:
        !firstHit || _isAfter(firstHit, results[0]) ? results[0] : firstHit,
      earliestLastHit:
        !earliestLastHit || _isBefore(lastHitForGetter, earliestLastHit)
          ? lastHitForGetter
          : earliestLastHit
    };
  };

  const _shouldProcessPage = ({ data, nextPageForGetter, getterIndex }) =>
    data[getterIndex].length === 0 && nextPageForGetter !== null;

  // NB Not hugely efficient
  const _tidyData = ({ data, trimmedPage }) =>
    data.reduce(
      (acc, getterData) => [
        ...acc,
        getterData.filter(hit => trimmedPage.indexOf(hit) === -1)
      ],
      []
    );

  const getNext = async userOptions => {
    // We recalculate these meta params on each page
    state.meta.firstHit = null;
    state.meta.earliestLastHit = null;

    for (let getterIndex = 0; getterIndex < getters.length; getterIndex++) {
      const getter = getters[getterIndex];
      const nextPageForGetter = state.nextPageForGetters[getterIndex];

      if (
        _shouldProcessPage({
          data: state.data,
          nextPageForGetter,
          getterIndex
        })
      ) {
        const results = await getter(nextPageForGetter, userOptions);

        if (results.length > 0) {
          state.data[getterIndex] = _sortPage(results);

          state.meta = _getMeta({
            currentMeta: state.meta,
            getterIndex,
            results
          });

          state.nextPageForGetters[getterIndex] = nextPageForGetter + 1;
        } else {
          state.nextPageForGetters[getterIndex] = null;
        }
      } else {
        if (state.data[getterIndex].length > 0) {
          state.meta = _getMeta({
            currentMeta: state.meta,
            getterIndex,
            results: state.data[getterIndex]
          });
        }
      }
    }

    const page = _mergeData(state.data);

    const trimmedPage =
      page.length > 0
        ? _trimPage({
            page,
            meta: state.meta
          })
        : page;

    state.data = _tidyData({ data: state.data, trimmedPage });

    return trimmedPage;
  };

  return {
    getNext,
    _getMeta,
    _getSortKey,
    _isAfter,
    _isBefore,
    _mergeData,
    _shouldProcessPage,
    _sortPage,
    _trimPage
  };
};
