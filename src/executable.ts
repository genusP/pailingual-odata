import { Query } from "./query";
import { Options } from "./options";

export class Executable {
    constructor(readonly query: Query) {

    }

    $exec(options?: Options) {
        return this.query.exec(options);
    }

    $url(options?: Options & { queryParams?: boolean }) {
        return this.query.url(
            (!options || options.queryParams!=false )
                ? true
                : false,
            options);
    }
}

export class ExecutableAndCount extends Executable
{
    $execWithCount(options?: Options) {
        const q = this.query.count({ inline: true })
        return q.exec(options);
    }
}