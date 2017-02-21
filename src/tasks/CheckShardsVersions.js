class CheckShardsVersions {
    constructor(log) {
        this.log = log;
        this.shards = [];
        this.currentIndex = 0
    }

    run() {
        return new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
            this.checkNextNode();
        })
    }

    checkNextNode() {
        if (this.currentIndex < this.shards.length) {
            this.shard = this.shards[this.currentIndex];
            return this.checkLastVersion()
        }
        this.resolve(this.shards)
    }

    checkLastVersion() {
        this.shard.shard.sqlQuery("select table_name from information_schema.tables where table_schema='public'")
            .success(this.onSuccessSelectTables.bind(this))
            .error(this.onErrorSelectTables.bind(this))
    }

    onSuccessSelectTables(res) {
        this.log.info('Success select table names', {res});
        const columns = [];
        for (const obj of res)
            columns.push(obj.table_name)
        if (columns.indexOf('schema_version') !== -1)
            this.shard.shard.sqlQuery("SELECT MAX(version) as version FROM schema_version")
                .success(this.onSuccessCheck.bind(this))
                .error(this.onErrorCheck.bind(this));
        else {
            this.log.info('Not tables in Db', {res});
            this.shard.migrationVersion = 0;
            this.checkDone()
        }
    }

    onErrorSelectTables(err) {
        this.log.info('Error select table names', {err});
        this.shard.migrationVersion = 0;
        this.checkDone('Error when select table names')
    }

    onSuccessCheck(res) {
        this.log.info('Success check migration', {res});
        if (res[0].version > 0)
            this.shard.migrationVersion = res[0].version;
        else
            this.shard.migrationVersion = 0;
        this.checkDone()
    }

    onErrorCheck(err) {
        this.log.info('Error check migration', {err});
        this.shard.migrationVersion = 0;
        this.checkDone()
    }

    checkDone() {
        this.currentIndex++;
        this.checkNextNode()
    }

    addShards(shards) {
        this.shards = shards
    }
}

module.exports = CheckShardsVersions;