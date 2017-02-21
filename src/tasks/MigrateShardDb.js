'use strict';

const EventEmitter = require('events');

class MigrateShardDb extends EventEmitter {
    constructor(params, shard, log) {
        super();
        this.params = params;
        this.shard = shard;
        this.log = log;
        this.migrationVersion = -1
    }

    checkLastVersion() {
        this.shard.sqlQuery("SELECT MAX(version) as version FROM schema_version").success(this.onSuccessCheck.bind(this)).error(this.onErrorCheck.bind(this))
    }

    getLastVersion() {
        if (this.migrationVersion <= 0)
            return 0;
        return this.migrationVersion
    }

    addVersion(version, name, username) {
        if (version > this.migrationVersion)
            this.migrationVersion = version;
        this.shard.sqlQuery("INSERT INTO schema_version (version,revision,name,installed_by,installed_on,execution_time,success) VALUES ($1,0,$2,$3,$4,0,true)",[version,name,username,new Date()]).success(this.successInsert.bind(this)).error(this.errorInsert.bind(this))
    }

    onSuccessCheck(result) {
        if (result[0].version > 0)
            this.migrationVersion = result[0].version;
        else
            this.migrationVersion = 0;
        this.emit('done')
    }

    onErrorCheck() {
        this.migrationVersion = 0;
        this.emit('done')
    }

    successInsert(result) {
        console.log('successInsert', result);
        this.emit('added', result)
    }

    errorInsert(result) {
        this.emit('failed', result)
    }
}

module.exports = MigrateShardDb;