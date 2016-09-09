/* 
* @Author: Mike Reich
* @Date:   2016-02-13 08:59:44
* @Last Modified 2016-09-09
*/

'use strict'

import WorkerQueue from '../'

describe("Worker Queue", () => {
  var module, app
 
  beforeEach(function() {
    this.timeout(3000)
  })
  
  describe("Load", () => {
    it("should not be null", () => WorkerQueue.should.not.be.null)

    it("should be instantiated", () => {
      module = new WorkerQueue()
      module.should.not.be.null
    })
  })
  
  describe("Init", () => {
    beforeEach(() => {
      module = new WorkerQueue()
      module._queues.should.not.be.null
    })
  })

  describe("Tasks", () => {
    beforeEach(() => {
      module = new WorkerQueue(app)
    })
    it("should process tasks", (done) => {
      module.worker('testTask', ({data}) => {
        data.hi.should.equal("World")
        done()
      })
      setTimeout(() => {
        module.task('testTask', {hi: "World"})
      }, 200)
    })
  })
})
