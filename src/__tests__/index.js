import combinePagination from "../index";
import casual from "casual";

casual.seed(10);

const modernHats = [
  {
    name: "Baseball Cap",
    sorting: { popularity: 95 }
  },
  {
    name: "Beanie",
    sorting: { popularity: 70 }
  },
  {
    name: "Golf",
    sorting: { popularity: 20 }
  },
  {
    name: "Other",
    sorting: { popularity: 10 }
  }
];

const oldHats = [
  {
    name: "Top Hat",
    sorting: { popularity: 60 }
  },
  {
    name: "Beret",
    sorting: { popularity: 15 }
  },
  {
    name: "Bowler Cap",
    sorting: { popularity: 9 }
  },
  {
    name: "Sombrero",
    sorting: { popularity: 5 }
  },
  {
    name: "Stetson",
    sorting: { popularity: 2 }
  }
];

const getData = (data, page, pageSize = 3) =>
  data.slice(page * pageSize, (page + 1) * pageSize);

describe("combine-paginators", () => {
  let combinedGetters;

  beforeEach(() => {
    combinedGetters = combinePagination({
      getters: [
        page => getData(modernHats, page),
        page => getData(oldHats, page)
      ],
      sortKey: "sorting.popularity"
    });
  });

  describe("test data", () => {
    it("is valid test data, generating out of order results", () => {
      expect([
        ...[...getData(modernHats, 0), ...getData(oldHats, 0)].sort(
          (a, b) => b.sorting.popularity - a.sorting.popularity
        ),
        ...[...getData(modernHats, 1), ...getData(oldHats, 1)].sort(
          (a, b) => b.sorting.popularity - a.sorting.popularity
        )
      ]).toEqual([
        modernHats[0],
        modernHats[1],
        oldHats[0],
        modernHats[2],
        oldHats[1],
        oldHats[2],
        modernHats[3],
        oldHats[3],
        oldHats[4]
      ]);
    });
  });

  describe("getNext", () => {
    it("get intersecting hits for first page of known data set", async () => {
      const page = await combinedGetters.getNext();

      expect(page).toEqual([
        modernHats[0],
        modernHats[1],
        oldHats[0],
        modernHats[2]
      ]);
    });

    it("get intersecting hits for second page of known data set", async () => {
      await combinedGetters.getNext();
      const page = await combinedGetters.getNext();

      expect(page).toEqual([oldHats[1], modernHats[3]]);
    });

    it("get hits for third page of known data set", async () => {
      await combinedGetters.getNext();
      await combinedGetters.getNext();
      const page = await combinedGetters.getNext();

      expect(page).toEqual([oldHats[2]]);
    });

    it("get trailing hits for fourth page of known data set", async () => {
      await combinedGetters.getNext();
      await combinedGetters.getNext();
      await combinedGetters.getNext();
      const page = await combinedGetters.getNext();

      expect(page).toEqual([oldHats[3], oldHats[4]]);
    });

    it("return empty array when known data set is exhausted", async () => {
      await combinedGetters.getNext();
      await combinedGetters.getNext();
      await combinedGetters.getNext();
      await combinedGetters.getNext();
      const page = await combinedGetters.getNext();

      expect(page).toEqual([]);
    });

    it("should return data in correct order when using ascending sort direction", async () => {
      const reversedModernHats = [...modernHats].reverse();
      const reversedOldHats = [...oldHats].reverse();

      const combinedGettersWithSorting = combinePagination({
        getters: [
          page => getData(reversedModernHats, page),
          page => getData(reversedOldHats, page)
        ],
        sortKey: "sorting.popularity",
        sortDirection: 'asc'
      });

      const page = await combinedGettersWithSorting.getNext();

      expect(page).toEqual([
        reversedOldHats[0],
        reversedOldHats[1],
        reversedOldHats[2]
      ]);

      const nextPage = await combinedGettersWithSorting.getNext();

      expect(nextPage).toEqual([
        reversedModernHats[0],
        reversedOldHats[3],
        reversedModernHats[1],
        reversedOldHats[4]
      ]);
    });

    // Randomly generating data sets ensures robustness against edge cases
    it("should return all results in order for 1000 random data sets", async () => {
      const minimumLength = 1;
      const maximumLength = 500;
      const minimumPopularity = 0;
      const maximumPopularity = 1000;
      const minimumPageSize = 1;
      const maximumPageSize = 100;
      const minimumNumberOfDataSets = 2;
      const maximumNumberOfDataSets = 5;

      for (let index = 0; index < 1000; index++) {
        // We ensure same maximum popularity is kept throughout run
        // This causes data to get distributed
        const maximumPopularityForRun = casual.integer(
          minimumPopularity,
          maximumPopularity
        );

        const numberDataSets = casual.integer(
          minimumNumberOfDataSets,
          maximumNumberOfDataSets
        );

        const dataSets = Array.from(
          {
            length: numberDataSets
          },
          () =>
            Array.from(
              { length: casual.integer(minimumLength, maximumLength) },
              () => ({
                sorting: {
                  popularity: casual.integer(
                    minimumPopularity,
                    maximumPopularityForRun
                  )
                }
              })
            ).sort((a, b) => b.sorting.popularity - a.sorting.popularity)
        );

        const pageSizeForDataSets = Array.from(
          {
            length: numberDataSets
          },
          () => casual.integer(minimumPageSize, maximumPageSize)
        );

        const expectedResult = dataSets
          .reduce((acc, dataSet) => [...acc, ...dataSet], [])
          .sort((a, b) => b.sorting.popularity - a.sorting.popularity);

        const getters = dataSets.map((dataSet, index) => page =>
          getData(dataSet, page, pageSizeForDataSets[index])
        );

        const combined = combinePagination({
          getters,
          sortKey: "sorting.popularity"
        });

        let lastResult;
        let allResults = [];

        while (lastResult !== []) {
          lastResult = await combined.getNext();

          if (lastResult.length === 0) {
            break;
          }

          allResults = [...allResults, ...lastResult];
        }

        expect(allResults).toEqual(expectedResult);
      }
    });
  });

  describe("getNextForGetter", () => {
    it("should get next results for a specific getter", async () => {
      const page = await combinedGetters.getNextForGetter(0);

      expect(page).toEqual([modernHats[0], modernHats[1], modernHats[2]]);
    });

    it("should get next results from a specific getter, regardless of the getNext state", async () => {
      await combinedGetters.getNext();
      const page = await combinedGetters.getNextForGetter(0);

      expect(page).toEqual([modernHats[0], modernHats[1], modernHats[2]]);
    });

    it("should get results for a specific getter, without interfering with getNext", async () => {
      await combinedGetters.getNext();
      await combinedGetters.getNextForGetter(1);
      await combinedGetters.getNextForGetter(1);
      const page = await combinedGetters.getNext();

      expect(page).toEqual([oldHats[1], modernHats[3]]);
    });

    it("should return [] when next page is null", async () => {
      await combinedGetters.injectState({
        getNextForGetter: { nextPageForGetters: [null, null] }
      });

      const page = await combinedGetters.getNextForGetter(1);

      expect(page).toEqual([]);
    });

    it("should return [] when pages are exhausted", async () => {
      await combinedGetters.getNextForGetter(1);
      await combinedGetters.getNextForGetter(1);

      const page = await combinedGetters.getNextForGetter(1);

      expect(page).toEqual([]);
    });
  });
});
