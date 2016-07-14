/* 
* @Author: Mike Reich
* @Date:   2016-02-13 08:59:44
* @Last Modified 2016-05-20
*/

'use strict';

import WorkerQueue from '../src/'

import TestApp from 'nxus-core/lib/test/support/TestApp';

describe("Worker Queue", () => {
  var module, app;
 
  beforeEach(function() {
    this.timeout(3000)
    app = new TestApp();
  });
  
  describe("Load", () => {
    it("should not be null", () => WorkerQueue.should.not.be.null)

    it("should be instantiated", () => {
      module = new WorkerQueue(app);
      module.should.not.be.null;
    });
  });
  describe("Init", () => {
    beforeEach(() => {
      module = new WorkerQueue(app);
    });

    it("should register a gather for workers", () => {
      return app.emit('load').then(() => {
        app.get.calledWith('worker-queue').should.be.true;
        app.get().gather.calledWith('worker').should.be.true;
      });
    })
    it("should register a handler for task", () => {
      return app.emit('load').then(() => {
        app.get().respond.calledWith('task').should.be.true;
      });
    })
  });
  describe("Tasks", () => {
    beforeEach(() => {
      module = new WorkerQueue(app);
    });
    it("should process tasks", (done) => {
      module.worker('testTask', ({data}) => {
        data.hi.should.equal("World")
        done()
      })
      setTimeout(() => {
        module.task('testTask', {hi: "World"})
      }, 200)
    });
  });
})
