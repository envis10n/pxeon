import * as _path from "https://deno.land/std@0.128.0/path/mod.ts";

export interface IListenerConf {
  hostname: string;
  port: number;
  file: string;
}

export interface IConfig {
  postgresql: {
    hostname: string;
    port?: number;
    username: string;
    password: string;
    database: string;
  };
  listeners?: IListenerConf[];
}

const _config_raw = await Deno.readFile(
  _path.resolve(Deno.cwd(), "pxeon.json"),
);
const _config_text = new TextDecoder().decode(_config_raw);
const _config: IConfig = JSON.parse(_config_text);

export default _config;
