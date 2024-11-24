"use server";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { MySQLClient, PGClient, SQLiteClient } from "@/lib/db";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const dbEnum = z
  .enum(["sqlite", "mysql", "postgres"])
  .describe("The type of database to connect to");

export const queryDb = async (
  query: string,
  connectionUri: string,
  dbType: z.infer<typeof dbEnum>,
  previousMessages?: string[]
) => {
  try {
    let innerQuery = "";
    const res = await generateText({
      model: openai("gpt-4o-mini"),
      system: `
    You are helping the user to understand a ${dbType} database. You can query the database to get the information you need. It is fine to query it multiple times
    to get a suitable answer for the user. You shouldn't edit any of the data in the database but it is fine to read from it. You may also return SQL which will 
    edit the database to the user but it is up to their discretion to run it. Make sure your response is relevant to the database and query, you should not provide overly
    general information. 

    The previous messages are: ${previousMessages?.join(", ")}
    `,
      tools: {
        queryDB: {
          description: "Query the database",
          parameters: z.object({
            query: z
              .string()
              .describe(
                "The query to run against the database. It must be a valid SQL query."
              ),
          }),
          execute: async ({ query }) => {
            innerQuery = query;
            console.log("Querying DB", dbType, query);
            switch (dbType) {
              case "sqlite":
                const sqlite = SQLiteClient(connectionUri);
                const res = await sqlite.prepare(query).get();
                return res;
              case "mysql":
                return await queryMySql(query, connectionUri);

              case "postgres":
                const pg = PGClient(connectionUri);
                await pg.connect();
                const pgRes = await pg.query(query);
                await pg.end();
                return pgRes;
              default:
                throw new Error("InvalidDBType");
            }
          },
        },
      },
      maxSteps: 5,
      prompt: `Explain to me the following in relation to the ${dbType} database: ${query}`,
    });
    return { data: res.text, error: null, query: innerQuery };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    return { error: "エラーが発生した", data: null, query: null };
  }
};

const queryMySql = async (query: string, connectionUri: string) => {
  const mysql = MySQLClient(connectionUri);

  return new Promise((resolve, reject) => {
    mysql.connect((connectErr) => {
      if (connectErr) {
        mysql.end();
        return reject(connectErr);
      }

      mysql.query(query, (error, result) => {
        if (error) return reject(error);
        resolve(result);
      });
    });
  });
};
