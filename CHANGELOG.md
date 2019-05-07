# [0.3.0](https://github.com/chrisvxd/combine-pagination/compare/v0.2.0...v0.3.0) (2019-05-07)


### Features

* add support for custom sort method ([f8f7d24](https://github.com/chrisvxd/combine-pagination/commit/f8f7d24))
* export helper method  for algolia's default relevance ranking ([1b3da92](https://github.com/chrisvxd/combine-pagination/commit/1b3da92))
* support nested sort keys ([aa0ceae](https://github.com/chrisvxd/combine-pagination/commit/aa0ceae))
* throw error if results are out of order ([7757b0c](https://github.com/chrisvxd/combine-pagination/commit/7757b0c))



# [0.2.0](https://github.com/chrisvxd/combine-pagination/compare/v0.1.0...v0.2.0) (2019-03-15)


### Features

* add extractState and injectState methods for SSR ([ca35af1](https://github.com/chrisvxd/combine-pagination/commit/ca35af1))
* add method to get results for specific getter, using shared cache with getNext ([b41312a](https://github.com/chrisvxd/combine-pagination/commit/b41312a))
* hide private methods from export ([a29cbb3](https://github.com/chrisvxd/combine-pagination/commit/a29cbb3))
* support passing options into getNext() ([745063e](https://github.com/chrisvxd/combine-pagination/commit/745063e))



# [0.1.0](https://github.com/chrisvxd/combine-pagination/compare/ce525d2...v0.1.0) (2019-03-13)


### Bug Fixes

* always return last hit during trimPage ([6760af3](https://github.com/chrisvxd/combine-pagination/commit/6760af3))
* capture all edge cases and replace all tests with getNext() tests ([295f832](https://github.com/chrisvxd/combine-pagination/commit/295f832))
* compare non-algolia results by using JSON stringify ([cf9f788](https://github.com/chrisvxd/combine-pagination/commit/cf9f788))
* don't duplicate hits ([86b9fd0](https://github.com/chrisvxd/combine-pagination/commit/86b9fd0))
* ensure results are always sorted ([8b29e64](https://github.com/chrisvxd/combine-pagination/commit/8b29e64))
* fix async by adding @babel/polyfill ([f871a66](https://github.com/chrisvxd/combine-pagination/commit/f871a66))
* fix sorting of last page ([15ae8e7](https://github.com/chrisvxd/combine-pagination/commit/15ae8e7))
* return results even if one getter returns an empty array ([3759ae6](https://github.com/chrisvxd/combine-pagination/commit/3759ae6))


### Features

* add initial code without tests ([ce525d2](https://github.com/chrisvxd/combine-pagination/commit/ce525d2))



