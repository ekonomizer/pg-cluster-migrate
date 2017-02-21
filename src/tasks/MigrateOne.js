'use strict';

class MigrateOne {
    constructor(filename, version, name, data, log) {
        this.filename = filename;
        this.version = version;
        this.name = name;
        this.data = data;
        this.log = log;
        this.shards = [];
        this.currentIndex = 0
    }

    run() {
        return new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
            this.migrateNextNode()
        })
    }

    migrateNextNode() {
        this.log.info('Run migration', {});
        if (this.currentIndex < this.shards.length) {
            if (this.shards[this.currentIndex].getLastVersion() >= this.version) {
                this.currentIndex++;
                this.migrateNextNode()
            } else
                this.shards[this.currentIndex].shard.sqlQuery(this.data)
                    .success(this.dbQuerySuccess.bind(this))
                    .error(this.dbQueryFailed.bind(this));
            return
        }
        this.migrationDone()
    }

    dbQuerySuccess(res) {
        this.log.info('Migration success', {res});
        // Обновляем версию миграции в БД.
        this.shards[this.currentIndex].once('added', this.onAdded.bind(this));
        this.shards[this.currentIndex].once('failed', this.onFailed.bind(this));
        this.shards[this.currentIndex].addVersion( this.version, this.name, this.shards[this.currentIndex].shard.client.user)
    }

    dbQueryFailed(err) {
        this.log.info('Migration failed', {err});
        this.migrationDone(err)
    }

    onAdded() {
        this.log.info('Success add version in schema');
        this.currentIndex++;
        this.migrateNextNode()
    }

    onFailed(err) {
        this.log.info('Failed add version in schema');
        this.migrationDone( "Can't update schema version for shard " + this.shards[this.currentIndex].shard.id + ": " + err )
    }

    migrationDone(err) {
        if (err) {
            this.log.info("Migration failed", {filename: this.filename, err});
            return this.reject(err)
        }

        this.resolve()
    }

    addShards(shards) {
        this.shards = shards
    }
}

module.exports = MigrateOne;