'use strict';

class DropDb {
    constructor(params, pgShard, log) {
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
            this.log.info('Can drop database');
            this.pgShard.sqlQuery('DROP DATABASE IF EXISTS ' + this.params.database).success(this.successDrop.bind(this)).error(this.errorDrop.bind(this))
        } else {
            this.log.info("Can't drop database, no Databases");
            this.resolve()
        }
    }

    onErrorTest(err) {
        this.log.info("Can't drop database error when check db. Exit. ", {err});
        this.reject()
    }

    successDrop(res) {
        this.log.info("Success drop db", {res});
        this.resolve()
    }

    errorDrop(err) {
        this.log.info("Error when try drop db. Exit. ", {err});
        this.reject()
    }
}

module.exports = DropDb;