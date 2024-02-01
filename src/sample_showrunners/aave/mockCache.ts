const redis = require('async-redis');

class CacheInstance {
  private ReddisInstance;
  constructor() {}
  /**
   * Set cache
   * @description adds a part
   * @param {String} key Cache Key
   * @param {String} value Cache Value
   * @return {Promise<{ null }>}
   */
  public async setCache(key: String, value: Number) {
    return null;
  }

  /**
   * push lcache
   * @description adds to a cache like an array
   * @param {String} key Cache Key
   * @param {String} value Cache Value
   * @return {Promise<{ null }>}
   */
  public async pushLCache(key: String, value: Number) {
    return null;
  }

  /**
   * get lcache
   * @description get all items in a list
   * @param {String} key Cache Key
   * @return {Promise<{ null }>}
   */
  public async getLCache(key: String) {
    return null;
  }

  /**
   * Add caches
   * @description adds to already existing value in cache
   * @param {String} key Cache Key
   * @param {Number} value Value to be added
   * @return {Promise<{ null }>}
   */
  public async addCache(key: String, value: Number) {
    const prev: Number = Number(await this.getCache(key));
    if (prev != 0) {
      value = Number(prev) + Number(value);
      value = Number(value) / 2;
    }
    return null;
  }

  /**
   * Remove cache
   * @description deletes a cache key and its associated values
   * @param {String} key Cache Key
   * @return {Promise<{ null }>}
   */
  public async removeCache(key: String) {
    return null;
  }

  /**
   * Get cache
   * @description retrieves the value of a cache key
   * @param {String} key Cache Key
   * @return {Promise<{ String }>}
   */
  public async getCache(key: String) {
    return null;
  }

  /**
   * Set set Icache
   * @description add cache for certain time period
   * @param {String} key Cache Key
   * @param {Number} expiresIn Time in seconds for expiry
   * @param {String} value Cache value
   * @return {Promise<{ String }>}
   */

  public async addIcache(key: String, value: String, expiresIn: Number) {
    return null;
  }
}

export default new CacheInstance();