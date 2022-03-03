import { DataTypes, Model } from "https://deno.land/x/denodb@v1.0.40/mod.ts";

export default class User extends Model {
  static table = "users";
  static timestamps = true;
  static fields = {
    id: { primaryKey: true, autoIncrement: true },
    username: DataTypes.STRING,
    hash: DataTypes.STRING,
    last_login: DataTypes.DATETIME,
    connection_chain: DataTypes.STRING,
  };
}
