import "@babel/polyfill";

/*
 * combinePagination()
 * */
export default ({ getters, sortKey, sortDirection = "desc" }) => {
  const state = {
    allResultsForGetters: getters.map(() => []),
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

  const _isBefore = (a, b, { eq = true }) => {
    if (sortDirection === "asc") {
      return eq
        ? _getSortKey(a) <= _getSortKey(b)
        : _getSortKey(a) < _getSortKey(b);
    }

    return eq
      ? _getSortKey(a) >= _getSortKey(b)
      : _getSortKey(a) > _getSortKey(b);
  };

  const _getLastHitForGetter = (allResultsForGetters, getterIndex) => {
    const allResultsForGetter = allResultsForGetters[getterIndex];

    const lastResults =
      allResultsForGetter.length > 0
        ? allResultsForGetter[allResultsForGetter.length - 1]
        : {};

    const lastHits = lastResults || [];

    const lastHitForGetter =
      lastHits.length > 0 ? lastHits[lastHits.length - 1] : null;

    return lastHitForGetter;
  };

  const _mergeLastResults = allResultsForGetters =>
    allResultsForGetters
      .reduce(
        (acc, resultsForGetter) => [
          ...acc,
          ...resultsForGetter[resultsForGetter.length - 1]
        ],
        []
      )
      .sort((a, b) => _isAfter(b, a));

  const _trimResults = ({ hits, meta }) => {
    const { firstHit, shortestPage } = meta;
    const lastHitForShortestPage = shortestPage[shortestPage.length - 1];

    const trimmedHits = hits.filter(
      hit =>
        _isAfter(hit, firstHit) &&
        _isBefore(hit, lastHitForShortestPage, { eq: false })
    );

    return [...hits, ...trimmedHits];
  };

  const _getMeta = ({ currentMeta, results }) => {
    const { firstHit, lastHit, shortestPage } = currentMeta;
    const lastHitForGetter = results[results.length - 1];

    return {
      firstHit:
        !firstHit || _isAfter(firstHit, results[0]) ? results[0] : firstHit,
      lastHit:
        !lastHit || _isAfter(lastHitForGetter, lastHit)
          ? lastHitForGetter
          : lastHit,
      shortestPage:
        !shortestPage ||
        (results.length > 0 && results.length < shortestPage.length)
          ? results
          : shortestPage
    };
  };

  const _shouldProcessPage = ({
    allResultsForGetters,
    nextPageForGetter,
    getterIndex,
    meta
  }) => {
    const { lastHit } = meta;
    const lastHitForGetter = _getLastHitForGetter(
      allResultsForGetters,
      getterIndex
    );

    if (nextPageForGetter === null) {
      return false;
    }

    if (
      lastHitForGetter &&
      lastHit &&
      lastHitForGetter.objectID === lastHit.objectID
    ) {
      return false;
    }

    return true;
  };

  const getNext = async () => {
    // We recalculate these meta params on each page
    state.meta.firstHit = null;
    state.meta.shortestPage = null;

    for (let getterIndex = 0; getterIndex < getters.length; getterIndex++) {
      const getter = getters[getterIndex];
      const nextPageForGetter = state.nextPageForGetters[getterIndex];

      if (
        _shouldProcessPage({
          allResultsForGetters: state.allResultsForGetters,
          meta: state.meta,
          nextPageForGetter,
          getterIndex
        })
      ) {
        const results = await getter(nextPageForGetter);

        if (results) {
          state.allResultsForGetters[getterIndex].push(results);

          state.meta = _getMeta({
            currentMeta: state.meta,
            results
          });
        } else {
          state.nextPageForGetters[getterIndex] = null;
        }
      }
    }

    const mergedHits = _mergeLastResults(state.allResultsForGetters);

    const trimmedHits = _trimResults({
      hits: mergedHits,
      meta: state.meta
    });

    return trimmedHits;
  };

  return {
    getNext,
    _getLastHitForGetter,
    _getMeta,
    _getSortKey,
    _isAfter,
    _isBefore,
    _mergeLastResults,
    _shouldProcessPage,
    _trimResults
  };
};
