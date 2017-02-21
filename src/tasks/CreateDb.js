'use strict';

const EventEmitter = require('events');

class CreateDb extends EventEmitter {
    constructor(params, pgShard, log) {
        super();
        this.params = params;
        this.pgShard = pgShard;
        this.log = log
    }

    run() {
        return new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
            this.pgShard.sqlQuery("SELECT 1 as test from pg_database WHERE datname='" + this.params.database + "'").success(this.onSuccessTest.bind(this)).error(this.onErrorTest.bind(this))
        })
    }

    onSuccessTest(result) {
        if (result.length > 0) {
            this.log.info("Can't create database exists");
            this.resolve()
        } else {
            this.log.info("Create databases");
            this.pgShard.sqlQuery('CREATE DATABASE ' + this.params.database).success(this.successCreate.bind(this)).error(this.errorCreate.bind(this))
        }
    }

    onErrorTest(err) {
        this.log.info("Can't create database error when check db. Exit. ", {err});
        this.reject()
    }

    successCreate(res) {
        this.log.info("Success create db", {res});
        this.resolve()
    }

    errorCreate(err) {
        this.log.info("Error when try create db. Exit. ", {err});
        this.reject()
    }
}

module.exports = CreateDb;