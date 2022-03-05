import { DataTypes, Model } from "https://deno.land/x/denodb@v1.0.40/mod.ts";

export default class User extends Model {
  static table = "users";
  static timestamps = true;
  static fields = {
    uuid: { primaryKey: true, type: DataTypes.UUID },
    username: DataTypes.STRING,
    hash: DataTypes.STRING,
    group: DataTypes.STRING,
    last_login: DataTypes.DATETIME,
    connection_chain: DataTypes.STRING,
  };
  uuid!: string;
  username!: string;
  hash!: string;
  group!: string;
  last_login!: Date;
  connection_chain!: string;
  created_at!: Date;
  updated_at!: Date;
}
