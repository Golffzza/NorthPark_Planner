import "dotenv/config";
import { defineConfig } from "prisma/config";

// E5.4 ONLY: points both datasource and shadow database at disposable localhost containers.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url: "postgresql://e5_fixture:e5_local_fixture_only@127.0.0.1:55439/northpark_e5_test",
    shadowDatabaseUrl: "postgresql://e5_fixture:e5_local_fixture_only@127.0.0.1:55440/northpark_e5_shadow_test",
  },
});
