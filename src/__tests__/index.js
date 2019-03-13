import combinePagination from "../index";
import casual from "casual";

casual.seed(10);

const modernHats = [
  {
    name: "Baseball Cap",
    popularity: 95
  },
  {
    name: "Beanie",
    popularity: 70
  },
  {
    name: "Golf",
    popularity: 20
  },
  {
    name: "Other",
    popularity: 10
  }
];

const oldHats = [
  {
    name: "Top Hat",
    popularity: 60
  },
  {
    name: "Beret",
    popularity: 15
  },
  {
    name: "Bowler Cap",
    popularity: 9
  },
  {
    name: "Sombrero",
    popularity: 5
  },
  {
    name: "Stetson",
    popularity: 2
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
      sortKey: "popularity"
    });
  });

  describe("test data", () => {
    it("is valid test data, generating out of order results", () => {
      expect([
        ...[...getData(modernHats, 0), ...getData(oldHats, 0)].sort(
          (a, b) => b.popularity - a.popularity
        ),
        ...[...getData(modernHats, 1), ...getData(oldHats, 1)].sort(
          (a, b) => b.popularity - a.popularity
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
                popularity: casual.integer(
                  minimumPopularity,
                  maximumPopularityForRun
                )
              })
            ).sort((a, b) => b.popularity - a.popularity)
        );

        const pageSizeForDataSets = Array.from(
          {
            length: numberDataSets
          },
          () => casual.integer(minimumPageSize, maximumPageSize)
        );

        const expectedResult = dataSets
          .reduce((acc, dataSet) => [...acc, ...dataSet], [])
          .sort((a, b) => b.popularity - a.popularity);

        const getters = dataSets.map((dataSet, index) => page =>
          getData(dataSet, page, pageSizeForDataSets[index])
        );

        const combined = combinePagination({
          getters,
          sortKey: "popularity"
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
});
