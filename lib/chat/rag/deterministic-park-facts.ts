import knowledgeIndex from "@/data/knowledge/knowledge-index.json";

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .replace(/[()[\]{}"'`.,!?/\\:;_-]/g, "");
}

function asksForProvince(query: string): boolean {
  const normalized = normalize(query);

  return (
    normalized.includes("จังหวัดอะไร") ||
    normalized.includes("จังหวัดไหน") ||
    normalized.includes("อยู่จังหวัด") ||
    normalized.includes("ตั้งอยู่จังหวัด")
  );
}

function formatProvinces(provinces: string[]): string {
  if (provinces.length <= 1) {
    return provinces[0] ?? "";
  }

  return `${provinces.slice(0, -1).join(" ")} และ${provinces.at(-1)}`;
}

export function answerDeterministicParkFact(
  query: string,
): string | undefined {
  if (!asksForProvince(query)) {
    return undefined;
  }

  const normalizedQuery = normalize(query);
  const park = [...knowledgeIndex]
    .sort((a, b) => b.nameTh.length - a.nameTh.length)
    .find((candidate) => {
      const fullName = normalize(candidate.nameTh);
      const shortName = normalize(
        candidate.nameTh.replace(/^อุทยานแห่งชาติ/, ""),
      );

      return (
        normalizedQuery.includes(fullName) ||
        (shortName.length >= 3 && normalizedQuery.includes(shortName))
      );
    });

  if (!park || park.provinces.length === 0) {
    return undefined;
  }

  const provinces = formatProvinces(park.provinces);

  if (park.provinces.length === 1) {
    return `${park.nameTh}อยู่ในจังหวัด${provinces}ครับ`;
  }

  return `${park.nameTh}ครอบคลุมพื้นที่จังหวัด${provinces}ครับ`;
}
