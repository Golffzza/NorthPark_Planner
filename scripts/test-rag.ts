import { knowledgeRetriever } from "@/lib/chat/rag/knowledge-retriever";

async function main() {
  const results = await knowledgeRetriever.search(
    "ดอยจงไปเช้าเย็นกลับได้ไหม",
    2,
  );

  for (const [index, result] of results.entries()) {
    console.log(`\n--- Result ${index + 1} ---`);
    console.log("Title:", result.title);
    console.log("Section:", result.section);
    console.log(
      "Similarity:",
      Number(result.similarity).toFixed(4),
    );
    console.log("Content:", result.content);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});