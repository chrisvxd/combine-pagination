import "@babel/polyfill";

/*
 * combinePagination()
 * */
export default ({ getters, sortKey, sortDirection = "desc" }) => {
  const state = {
    pages: getters.map(() => []),
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

  const _getLastHitForGetter = (pages, getterIndex) => {
    const pagesForGetter = pages[getterIndex];

    const page =
      pagesForGetter.length > 0
        ? pagesForGetter[pagesForGetter.length - 1]
        : {};

    const lastPage = page || [];

    const lastHitForGetter =
      lastPage.length > 0 ? lastPage[lastPage.length - 1] : null;

    return lastHitForGetter;
  };

  const _mergeLastPage = pages =>
    pages
      .reduce(
        (acc, pagesForGetter) => [
          ...acc,
          ...pagesForGetter[pagesForGetter.length - 1]
        ],
        []
      )
      .sort((a, b) => _isAfter(a, b));

  const _trimPage = ({ page, meta }) => {
    const { firstHit, shortestPage } = meta;
    const lastHitForShortestPage = shortestPage[shortestPage.length - 1];

    const trimmedPage = page.filter(
      hit =>
        _isAfter(hit, firstHit) &&
        _isBefore(hit, lastHitForShortestPage, { eq: false })
    );

    return [...page, ...trimmedPage];
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
    pages,
    nextPageForGetter,
    getterIndex,
    meta
  }) => {
    const { lastHit } = meta;
    const lastHitForGetter = _getLastHitForGetter(pages, getterIndex);

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
          pages: state.pages,
          meta: state.meta,
          nextPageForGetter,
          getterIndex
        })
      ) {
        const results = await getter(nextPageForGetter);

        if (results) {
          state.pages[getterIndex].push(results);

          state.meta = _getMeta({
            currentMeta: state.meta,
            results
          });
        } else {
          state.nextPageForGetters[getterIndex] = null;
        }
      }
    }

    const mergedPage = _mergeLastPage(state.pages);

    const trimmedPage = _trimPage({
      page: mergedPage,
      meta: state.meta
    });

    return trimmedPage;
  };

  return {
    getNext,
    _getLastHitForGetter,
    _getMeta,
    _getSortKey,
    _isAfter,
    _isBefore,
    _mergeLastPage,
    _shouldProcessPage,
    _trimPage
  };
};
