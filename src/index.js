/* 
* @Author: Mike Reich
* @Date:   2016-02-05 07:45:34
* @Last Modified 2016-02-13
*/

'use strict';

import redis from 'redis'

const _defaultConfig = {
  redis_url: process.env.REDIS_URL || 'redis://localhost:6379'
}

/**
 * Worker Queue module for background tasks
 */
export default class WorkerQueue {
  constructor(app) {
    this.app = app
    this.config = Object.assign(_defaultConfig, app.config['worker-queue'])

    app.get('worker-queue').use(this)
      .gather('worker')
      .respond('task')
      
    app.onceAfter('load', this._connect.bind(this))
    app.once('stop', this._disconnect.bind(this))
  }

  // Handlers

  /**
   * Provide a task handler
   * @param {string} taskName Name of the task (channel) to listen for
   * @param {function} handler Handler for processing task requests
   * @example app.get('worker-queue').worker('backgroundJob', (msg) -> {})
   */
  
  worker (taskName, handler) {
    this.app.log.debug('Registering task worker for', taskName)
    this.subscriber.subscribe(taskName)
    this.on("worker-"+taskName, handler)
  }

  /**
   * Request handling of a background task
   * @param {string} taskName Name of the task (channel) to publish to
   * @param {object} message Options for the task worker
   * @example app.get('worker-queue').task('backgroundJob', {hi: 'world'})
   */
  task (taskName, message) {
    this.app.log.debug('Task requested', taskName)
    this.publisher.publish(taskName, JSON.stringify(message))
  }
  

  // Internal

  _connect () {
    // Redis needs separate connections for pub/sub
    this.publisher = redis.createClient(this.config.redis_url)
    this.publisher.on("error", (err) => {
      this.app.log.debug("Publisher error", err)
    })
    this.subscriber = redis.createClient(this.config.redis_url)
    this.subscriber.on("error", (err) => {
      this.app.log.debug("Subscriber error", err)
    })
    this.subscriber.on("message", (channel, message) => {
      message = JSON.parse(message)
      this.emit("worker-"+channel, message)
    })
    this.app.log.debug('Connected to task queue pubsub')
  }

  _disconnect () {
    if (this.publisher) {
      this.publisher.quit()
      delete this.publisher
    }
    if (this.subscriber) {
      this.subscriber.unsubscribe()
      this.subscriber.quit()
      delete this.subscriber
    }
  }
} 
