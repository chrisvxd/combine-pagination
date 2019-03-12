import combinePagination from "../index";

const modernHats = [
  {
    name: "Baseball Cap",
    popularity: 95
  },
  {
    name: "Beanie",
    popularity: 50
  },
  {
    name: "Golf",
    popularity: 20
  }
];

const oldHats = [
  {
    name: "Top Hat",
    popularity: 85
  },
  {
    name: "Beret",
    popularity: 15
  },
  {
    name: "Bowler Cap",
    popularity: 9
  }
];

const getData = (data, page) => data.slice((page - 1) * 2, page * 2);

describe("combine-paginators", () => {
  let combinedGetters = combinePagination({
    getters: [
      page => getData(modernHats, page),
      page => getData(oldHats, page)
    ],
    sortKey: "popularity"
  });

  beforeEach(() => {
    combinedGetters = combinePagination({
      getters: [
        page => getData(modernHats, page),
        page => getData(oldHats, page)
      ],
      sortKey: "popularity"
    });
  });

  describe("_getLastHitForGetter", () => {
    it("must return the last hit for a specific getter", () => {
      expect(
        combinedGetters._getLastHitForGetter([["a", "b"], ["c", "d"]], 0)
      ).toEqual("b");
    });

    it("must return null if the getter has no results", () => {
      expect(combinedGetters._getLastHitForGetter([[], []], 0)).toEqual(null);
    });
  });

  describe("_getMeta", () => {
    describe("firstHit", () => {
      it("must be updated if the results contain an earlier hit than currentMeta", () => {
        expect(
          combinedGetters._getMeta({
            currentMeta: { firstHit: { popularity: 5 } },
            results: [{ popularity: 10 }]
          }).firstHit
        ).toEqual({ popularity: 10 });
      });

      it("must NOT be updated if the results contain a later hit than currentMeta", () => {
        expect(
          combinedGetters._getMeta({
            currentMeta: { firstHit: { popularity: 5 } },
            results: [{ popularity: 1 }]
          }).firstHit
        ).toEqual({ popularity: 5 });
      });

      it("must be set if not defined in currentMeta and results contains any hits", () => {
        expect(
          combinedGetters._getMeta({
            currentMeta: {},
            results: [{ popularity: 10 }]
          }).firstHit
        ).toEqual({ popularity: 10 });
      });

      it("must NOT be set if one is not defined in currentMeta and results is empty", () => {
        expect(
          combinedGetters._getMeta({
            currentMeta: {},
            results: []
          }).firstHit
        ).toBeUndefined();
      });
    });

    describe("lastHit", () => {
      it("must be updated if the results contain a later hit than currentMeta", () => {
        expect(
          combinedGetters._getMeta({
            currentMeta: { lastHit: { popularity: 10 } },
            results: [{ popularity: 5 }]
          }).lastHit
        ).toEqual({ popularity: 5 });
      });

      it("must NOT be updated if the results contain an earlier hit than currentMeta", () => {
        expect(
          combinedGetters._getMeta({
            currentMeta: { lastHit: { popularity: 5 } },
            results: [{ popularity: 10 }]
          }).lastHit
        ).toEqual({ popularity: 5 });
      });

      it("must be set if not defined in currentMeta and results contains any hits", () => {
        expect(
          combinedGetters._getMeta({
            currentMeta: {},
            results: [{ popularity: 10 }]
          }).lastHit
        ).toEqual({ popularity: 10 });
      });

      it("must NOT be set if one is not defined in currentMeta and results is empty", () => {
        expect(
          combinedGetters._getMeta({
            currentMeta: {},
            results: []
          }).lastHit
        ).toBeUndefined();
      });
    });

    describe("shortestPage", () => {
      it("must be updated if the results are shorter than shortestPage in currentMeta", () => {
        expect(
          combinedGetters._getMeta({
            currentMeta: { shortestPage: ["a", "b", "c"] },
            results: ["a", "b"]
          }).shortestPage
        ).toEqual(["a", "b"]);
      });

      it("must NOT be updated if the results are longer than shortestPage in currentMeta", () => {
        expect(
          combinedGetters._getMeta({
            currentMeta: { shortestPage: ["a", "b"] },
            results: ["a", "b", "c"]
          }).shortestPage
        ).toEqual(["a", "b"]);
      });

      it("must be set if not defined in currentMeta and results contains any hits", () => {
        expect(
          combinedGetters._getMeta({
            currentMeta: {},
            results: ["a", "b", "c"]
          }).shortestPage
        ).toEqual(["a", "b", "c"]);
      });

      it("must NOT be set if one is not defined in currentMeta and results is empty", () => {
        expect(
          combinedGetters._getMeta({
            currentMeta: { shortestPage: ["a", "b", "c"] },
            results: []
          }).shortestPage
        ).toEqual(["a", "b", "c"]);
      });
    });
  });

  describe("_getSortKey", () => {
    it("retrieves the sort key from a hit", () => {
      expect(
        combinedGetters._getSortKey({ test: true, popularity: 50 })
      ).toEqual(50);
    });
  });

  describe("_isAfter", () => {
    describe("with sortDirection='desc'", () => {
      it("returns true if a's sort key is less than b's sort key", () => {
        expect(
          combinedGetters._isAfter({ popularity: 50 }, { popularity: 100 })
        ).toBe(true);
      });

      it("returns true if a's sort key is equal to b's sort key", () => {
        expect(
          combinedGetters._isAfter({ popularity: 50 }, { popularity: 50 })
        ).toBe(true);
      });

      it("returns false if a's sort key is equal to b's sort key, when options.eq === false", () => {
        expect(
          combinedGetters._isAfter(
            { popularity: 50 },
            { popularity: 50 },
            { eq: false }
          )
        ).toBe(false);
      });

      it("returns false if a's sort key is greater than b's sort key", () => {
        expect(
          combinedGetters._isAfter({ popularity: 100 }, { popularity: 50 })
        ).toBe(false);
      });
    });

    describe("with sortDirection='asc'", () => {
      beforeEach(() => {
        combinedGetters = combinePagination({
          getters: [
            page => getData(modernHats, page),
            page => getData(oldHats, page)
          ],
          sortKey: "popularity",
          sortDirection: "asc"
        });
      });

      it("returns true if a's sort key is greater than b's sort key", () => {
        expect(
          combinedGetters._isAfter({ popularity: 100 }, { popularity: 50 })
        ).toBe(true);
      });

      it("returns true if a's sort key is equal to b's sort key", () => {
        expect(
          combinedGetters._isAfter({ popularity: 50 }, { popularity: 50 })
        ).toBe(true);
      });

      it("returns false if a's sort key is equal to b's sort key, when options.eq === false", () => {
        expect(
          combinedGetters._isAfter(
            { popularity: 50 },
            { popularity: 50 },
            { eq: false }
          )
        ).toBe(false);
      });

      it("returns false if a's sort key is less than b's sort key", () => {
        expect(
          combinedGetters._isAfter({ popularity: 50 }, { popularity: 100 })
        ).toBe(false);
      });
    });
  });

  describe("_isBefore", () => {
    describe("with sortDirection='desc'", () => {
      it("returns true if a's sort key is greater than b's sort key", () => {
        expect(
          combinedGetters._isBefore({ popularity: 100 }, { popularity: 50 })
        ).toBe(true);
      });

      it("returns true if a's sort key is equal to b's sort key", () => {
        expect(
          combinedGetters._isBefore({ popularity: 50 }, { popularity: 50 })
        ).toBe(true);
      });

      it("returns false if a's sort key is equal to b's sort key, when options.eq === false", () => {
        expect(
          combinedGetters._isBefore(
            { popularity: 50 },
            { popularity: 50 },
            { eq: false }
          )
        ).toBe(false);
      });

      it("returns false if a's sort key is less than b's sort key", () => {
        expect(
          combinedGetters._isBefore({ popularity: 50 }, { popularity: 100 })
        ).toBe(false);
      });
    });

    describe("with sortDirection='asc'", () => {
      beforeEach(() => {
        combinedGetters = combinePagination({
          getters: [
            page => getData(modernHats, page),
            page => getData(oldHats, page)
          ],
          sortKey: "popularity",
          sortDirection: "asc"
        });
      });

      it("returns true if a's sort key is less than b's sort key", () => {
        expect(
          combinedGetters._isBefore({ popularity: 50 }, { popularity: 100 })
        ).toBe(true);
      });

      it("returns true if a's sort key is equal to b's sort key", () => {
        expect(
          combinedGetters._isBefore({ popularity: 50 }, { popularity: 50 })
        ).toBe(true);
      });

      it("returns false if a's sort key is equal to b's sort key, when options.eq === false", () => {
        expect(
          combinedGetters._isBefore(
            { popularity: 50 },
            { popularity: 50 },
            { eq: false }
          )
        ).toBe(false);
      });

      it("returns false if a's sort key is greater than b's sort key", () => {
        expect(
          combinedGetters._isBefore({ popularity: 100 }, { popularity: 50 })
        ).toBe(false);
      });
    });
  });

  describe("_mergeLastPage", () => {
    it("should merge the last page for each getter", () => {
      expect(
        combinedGetters._mergeLastPage([
          [
            [{ popularity: 8 }, { popularity: 7 }],
            [{ popularity: 5 }, { popularity: 6 }]
          ],
          [
            [{ popularity: 4 }, { popularity: 3 }],
            [{ popularity: 1 }, { popularity: 2 }]
          ]
        ])
      ).toEqual([
        { popularity: 6 },
        { popularity: 5 },
        { popularity: 2 },
        { popularity: 1 }
      ]);
    });
  });
});
