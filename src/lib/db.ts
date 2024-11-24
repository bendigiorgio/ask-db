import SQLiteDatabase from "libsql";
import mySQLDatabase from "mysql";
import { Client as PGDatabase } from "pg";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export const PGClient = (connectionUri: string) => {
  const client = new PGDatabase(connectionUri);
  return client;
};

export const MySQLClient = (connectionUri: string) => {
  const client = mySQLDatabase.createConnection(connectionUri);
  return client;
};

export const SQLiteClient = (connectionString: string) => {
  const client = new SQLiteDatabase(connectionString);
  return client;
};
