# combine-pagination 🦑

`combine-pagination` is a JavaScript library for paginating across multiple data sources at once, whilst retaining the sort order.

- **Great for Infinity Scroll**: easily support multiple data sources in your infinity scroll.
- **Retain order**: your data is always in order, even when it comes from different sources.
- **Service agnostic**: work with any data service, whether REST, GraphQL, Algolia or another.
- **Mix-and-match services**: mix data services as you see fit, making one query from GraphQL and one from Algolia.
- **Efficient**: only fetch data when needed for that data source.

Used in production at https://wellpaid.io.

## Installation

```sh
npm i combine-pagination --save
```

or

```sh
yarn add combine-pagination
```

## Quick examples

If you already understand [the problem](#the-problem), here are some quick examples for paginating across multiple data sets in different scenarios.

### Generic

Paginate data from two generic data sets.

```js
const combinedGetters = combinePagination({
  getters: [page => getDataA(page), page => getDataB(page)],
  sortKey: "popularity"
});

const pageOne = await combinedGetters.getNext();
const pageTwo = await combinedGetters.getNext();
```

### Algolia

Paginate data from two distinct algolia queries, each with a different keyword.

```js
const index = algoliasearch({
  //...
}).initIndex("hats");

const combinedGetters = combinePagination({
  getters: [
    page => index.query({ page, hitsPerPage: 15, query: "Baseball cap" }),
    page => index.query({ page, hitsPerPage: 15, query: "Top hat" })
  ],
  sortKey: "popularity"
});

const pageOne = await combinedGetters.getNext();
const pageTwo = await combinedGetters.getNext();
```

## The Problem

Suppose you have two data sets, `modernHats` and `oldHats`, and you want to combine them into one data set sorted by `popularity` called `hats`:

```js
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
    name: "Flat Cap",
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
    name: "Bowler Hat",
    popularity: 9
  }
];
```

In this example, we’ll be paginating 2 results at a time. Let’s create a getter to paginate our data:

```js
const getData = (data, page) => data.slice((page - 1) * 2, page * 2);
```

> Note, in reality you probably already have a data getting with pagination support to retrieve the data via a server.

Now let's get our data. Without using `combine-pagination`, we might be tempted to just paginate each, sort and combine them. **This is what NOT to do:**

```js
const modernHatsPage = getData(modernHats, 0);
const oldHatsPage = getData(oldHats, 0);

const hats = [...modernHatsPage, ...oldHatsPage].sort(
  (a, b) => a.popularity - b.popularity
);
```

This will result in hats that looks like this

```js
[
  {
    name: "Baseball Cap",
    popularity: 95
  },
  {
    name: "Top Hat",
    popularity: 85
  },
  {
    name: "Beanie",
    popularity: 50
  },
  {
    name: "Beret",
    popularity: 15
  }
];
```

This looks fine, until you query the second page, which will look like this

```js
[
  {
    name: "Flat Cap",
    popularity: 20
  },
  {
    name: "Bowler Hat",
    popularity: 9
  }
];
```

If we combine these results, you’ll notice that now the **results are out of order**. Sure, we could resort our entire data set, but this has some problems:

1. Reordering UI is confusing - if we’re rendering `hats` in a UI, such as an infinity scroll, it will cause the UI to reorder and confuse the user.
2. Inefficient sort - resorting the entire data set on each pagination is highly inefficient.
3. Unnecessary data request - depending on the order of the data, getting both data sets at once might be unnecessary, especially if a network request is involved.

## The Solution

Using a technique (currently) called [Framed Range Intersection](#framed-range-intersection), we can conservatively hold back trailing data from the first page that we think might overlap with subsequent pages. In the example above, it would mean holding back "Beret" until the next page is retrieved.

`combine-pagination` implements this technique. Let's try again using the above data set:

```js
import combinePagination from "combine-pagination";

const combinedGetters = combinePagination({
  getters: [page => getData(modernHats, page), page => getData(oldHats, page)],
  sortKey: "popularity"
});
```

And query the first page:

```js
const page = await combinedGetters.getNext();
```

Resulting in:

```js
[
  {
    name: "Baseball Cap",
    popularity: 95
  },
  {
    name: "Top Hat",
    popularity: 85
  },
  {
    name: "Beanie",
    popularity: 50
  }
];
```

As expected, we only received three results. `combine-pagination` is only showing intersecting data, holding "Beret" back until it receives the next data set. Because of this, you can't define exactly how many results you want to receive. See [Fuzzy Pagination](#fuzzy-pagination).

The second time we run `getNext()`, we get the next set of data, but this time in the correct order:

```js
[
  {
    name: "Flat Cap",
    popularity: 20
  },
  {
    name: "Beret",
    popularity: 15
  },
  {
    name: "Bowler Hat",
    popularity: 9
  }
];
```

`combine-pagination` noticed that "Beret", which was held back from the first set of results, intersects "Flat Cap" and "Bowler Hat", so has inserted it and sorted the page.

That's it. Each time you call `getNext()`, you'll retreive the next set of sorted data until the getters are exhausted.

## Use cases

- Using infinity scroll across multiple data sources.
- Paginating across multiple Algolia queries, such as one geo location query and one not.
- Paginating across different services.

## Fuzzy Pagination

Each time you execute `getNext()`, you can't be sure how many results you're going to receive. We call this **Fuzzy Pagination**, which returns `0 - n` results for any given page with page size `n`. This technique is best suited for infinity scroll type use cases.

In normal pagination, you would receive `n` results for each page, only receiving `0 - n` results on the final page.

## Framed Range Intersecting

Intersecting ranges is a technique for finding values that overlap in two sets of data. For example:

- Intersection of [0, 3] & [2, 4] is [2, 3]
- Intersection of [-1, 34] & [0, 4] is [0, 4]
- Intersection of [0, 3] & [4, 4] is empty set

combine-paginators uses a technique called Framed Range Intersecting (name is WIP), a type of intersecting that determines the leading data set, and intersects the other data sets within that.

Unlike normal range intersecting:

- The first value is the first value of the leading data set.
- The last value is either the last value of the leading data set, or the the last value of the intersecting data set that finishes first.
- Values in multiple data sets are duplicated.

For example:

- Framed Intersection of [0, 3] & [2, 4] is [0, 2, 3]
- Framed Intersection of [-1, 34] & [0, 4] is [-1, 0, 4]
- Framed Intersection of [0, 3] & [4, 4] is [0, 3]
- Framed Intersection of [0, 3] & [2, 4] & [1, 2] is [0, 1, 2, 2]
