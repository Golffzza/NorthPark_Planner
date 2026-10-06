// ./lib/data/province-coordinates.ts

export type ProvinceCoordinate = {
  id: number;
  name: string;
  lat: number;
  lng: number;
  zoom: number;
};

export const provinceCoordinates: ProvinceCoordinate[] = [
  { id: 1, name: "กรุงเทพมหานคร", lat: 13.7278956, lng: 100.5241235, zoom: 13 },
  { id: 2, name: "กระบี่", lat: 8.0862997, lng: 98.9062835, zoom: 13 },
  { id: 3, name: "กาญจนบุรี", lat: 14.0227797, lng: 99.5328115, zoom: 13 },
  { id: 4, name: "กาฬสินธุ์", lat: 16.4314078, lng: 103.5058755, zoom: 13 },
  { id: 5, name: "กำแพงเพชร", lat: 16.4827798, lng: 99.5226618, zoom: 13 },
  { id: 6, name: "ขอนแก่น", lat: 16.4419355, lng: 102.8359921, zoom: 13 },
  { id: 7, name: "จันทบุรี", lat: 12.61134, lng: 102.1038546, zoom: 13 },
  { id: 8, name: "ฉะเชิงเทรา", lat: 13.6904194, lng: 101.0779596, zoom: 13 },
  { id: 9, name: "ชลบุรี", lat: 13.3611431, lng: 100.9846717, zoom: 13 },
  { id: 10, name: "ชัยนาท", lat: 15.1851971, lng: 100.125125, zoom: 13 },
  { id: 11, name: "ชัยภูมิ", lat: 15.8068173, lng: 102.0315027, zoom: 13 },
  { id: 12, name: "ชุมพร", lat: 10.4930496, lng: 99.1800199, zoom: 13 },
  { id: 13, name: "เชียงราย", lat: 19.9071656, lng: 99.830955, zoom: 13 },
  { id: 14, name: "เชียงใหม่", lat: 18.7877477, lng: 98.9931311, zoom: 13 },
  { id: 15, name: "ตรัง", lat: 7.5593851, lng: 99.6110065, zoom: 13 },
  { id: 16, name: "ตราด", lat: 12.2427563, lng: 102.5174734, zoom: 13 },
  { id: 17, name: "ตาก", lat: 16.8839901, lng: 99.1258498, zoom: 13 },
  { id: 18, name: "นครนายก", lat: 14.2069466, lng: 101.2130511, zoom: 13 },
  { id: 19, name: "นครปฐม", lat: 13.8199206, lng: 100.0621676, zoom: 13 },
  { id: 20, name: "นครพนม", lat: 17.392039, lng: 104.7695508, zoom: 13 },
  { id: 21, name: "นครราชสีมา", lat: 14.9798997, lng: 102.0977693, zoom: 13 },
  { id: 22, name: "นครศรีธรรมราช", lat: 8.4303975, lng: 99.9631219, zoom: 13 },
  { id: 23, name: "นครสวรรค์", lat: 15.6930072, lng: 100.1225595, zoom: 13 },
  { id: 24, name: "นนทบุรี", lat: 13.8621125, lng: 100.5143528, zoom: 13 },
  { id: 25, name: "นราธิวาส", lat: 6.4254607, lng: 101.8253143, zoom: 13 },
  { id: 26, name: "น่าน", lat: 18.7756318, lng: 100.7730417, zoom: 13 },
  { id: 27, name: "บุรีรัมย์", lat: 14.9930017, lng: 103.1029191, zoom: 13 },
  { id: 28, name: "ปทุมธานี", lat: 14.0208391, lng: 100.5250276, zoom: 13 },
  { id: 29, name: "ประจวบคีรีขันธ์", lat: 11.812367, lng: 99.7973271, zoom: 13 },
  { id: 30, name: "ปราจีนบุรี", lat: 14.0509704, lng: 101.3727439, zoom: 13 },
  { id: 31, name: "ปัตตานี", lat: 6.8694844, lng: 101.2504826, zoom: 13 },
  { id: 32, name: "พระนครศรีอยุธยา", lat: 14.3532128, lng: 100.5689599, zoom: 13 },
  { id: 33, name: "พะเยา", lat: 19.1664789, lng: 99.9019419, zoom: 13 },
  { id: 34, name: "พังงา", lat: 8.4407456, lng: 98.5193032, zoom: 13 },
  { id: 35, name: "พัทลุง", lat: 7.6166823, lng: 100.0740231, zoom: 13 },
  { id: 36, name: "พิจิตร", lat: 16.4429516, lng: 100.3482329, zoom: 13 },
  { id: 37, name: "พิษณุโลก", lat: 16.8298048, lng: 100.2614915, zoom: 13 },
  { id: 38, name: "เพชรบุรี", lat: 13.1111601, lng: 99.9391307, zoom: 13 },
  { id: 39, name: "เพชรบูรณ์", lat: 16.4189807, lng: 101.1550926, zoom: 13 },
  { id: 40, name: "แพร่", lat: 18.1445774, lng: 100.1402831, zoom: 13 },
  { id: 41, name: "ภูเก็ต", lat: 7.9810496, lng: 98.3638824, zoom: 13 },
  { id: 42, name: "มหาสารคาม", lat: 16.1850896, lng: 103.3026461, zoom: 13 },
  { id: 43, name: "มุกดาหาร", lat: 16.542443, lng: 104.7209151, zoom: 13 },
  { id: 44, name: "แม่ฮ่องสอน", lat: 19.2990643, lng: 97.9656226, zoom: 13 },
  { id: 45, name: "ยโสธร", lat: 15.792641, lng: 104.1452827, zoom: 13 },
  { id: 46, name: "ยะลา", lat: 6.541147, lng: 101.2803947, zoom: 13 },
  { id: 47, name: "ร้อยเอ็ด", lat: 16.0538196, lng: 103.6520036, zoom: 13 },
  { id: 48, name: "ระนอง", lat: 9.9528702, lng: 98.6084641, zoom: 13 },
  { id: 49, name: "ระยอง", lat: 12.6833115, lng: 101.2374295, zoom: 13 },
  { id: 50, name: "ราชบุรี", lat: 13.5282893, lng: 99.8134211, zoom: 13 },
  { id: 51, name: "ลพบุรี", lat: 14.7995081, lng: 100.6533706, zoom: 13 },
  { id: 52, name: "ลำปาง", lat: 18.2888404, lng: 99.490874, zoom: 13 },
  { id: 53, name: "ลำพูน", lat: 18.5744606, lng: 99.0087221, zoom: 13 },
  { id: 54, name: "เลย", lat: 17.4860232, lng: 101.7223002, zoom: 13 },
  { id: 55, name: "ศรีสะเกษ", lat: 15.1186009, lng: 104.3220095, zoom: 13 },
  { id: 56, name: "สกลนคร", lat: 17.1545995, lng: 104.1348365, zoom: 13 },
  { id: 57, name: "สงขลา", lat: 7.1756004, lng: 100.614347, zoom: 13 },
  { id: 58, name: "สตูล", lat: 6.6238158, lng: 100.0673744, zoom: 13 },
  { id: 59, name: "สมุทรปราการ", lat: 13.5990961, lng: 100.5998319, zoom: 13 },
  { id: 60, name: "สมุทรสงคราม", lat: 13.4098217, lng: 100.0022645, zoom: 13 },
  { id: 61, name: "สมุทรสาคร", lat: 13.5475216, lng: 100.2743956, zoom: 13 },
  { id: 62, name: "สระแก้ว", lat: 13.824038, lng: 102.0645839, zoom: 13 },
  { id: 63, name: "สระบุรี", lat: 14.5289154, lng: 100.9101421, zoom: 13 },
  { id: 64, name: "สิงห์บุรี", lat: 14.8936253, lng: 100.3967314, zoom: 13 },
  { id: 65, name: "สุโขทัย", lat: 17.0055573, lng: 99.8263712, zoom: 13 },
  { id: 66, name: "สุพรรณบุรี", lat: 14.4744892, lng: 100.1177128, zoom: 13 },
  { id: 67, name: "สุราษฎร์ธานี", lat: 9.1382389, lng: 99.3217483, zoom: 13 },
  { id: 68, name: "สุรินทร์", lat: 14.882905, lng: 103.4937107, zoom: 13 },
  { id: 69, name: "หนองคาย", lat: 17.8782803, lng: 102.7412638, zoom: 13 },
  { id: 70, name: "หนองบัวลำภู", lat: 17.2218247, lng: 102.4260368, zoom: 13 },
  { id: 71, name: "อ่างทอง", lat: 14.5896054, lng: 100.455052, zoom: 13 },
  { id: 72, name: "อำนาจเจริญ", lat: 15.8656783, lng: 104.6257774, zoom: 13 },
  { id: 73, name: "อุดรธานี", lat: 17.4138413, lng: 102.7872325, zoom: 13 },
  { id: 74, name: "อุตรดิตถ์", lat: 17.6200886, lng: 100.0992942, zoom: 13 },
  { id: 75, name: "อุทัยธานี", lat: 15.3835001, lng: 100.0245527, zoom: 13 },
  { id: 76, name: "อุบลราชธานี", lat: 15.2286861, lng: 104.8564217, zoom: 13 },
  { id: 77, name: "บึงกาฬ", lat: 18.3609104, lng: 103.6464463, zoom: 13 },
];

const ALIASES: Record<string, string> = {
  กทม: "กรุงเทพมหานคร",
  กรุงเทพ: "กรุงเทพมหานคร",
  โคราช: "นครราชสีมา",
  อยุธยา: "พระนครศรีอยุธยา",
  แปดริ้ว: "ฉะเชิงเทรา",
};

export function getProvinceCoordinate(query: string): ProvinceCoordinate | undefined {
  if (!query || typeof query !== "string") return undefined;
  const clean = query.trim().replace(/^จังหวัด\s*/, "").replace(/^จ\.\s*/, "").trim();

  const aliased = ALIASES[clean] ?? clean;

  return provinceCoordinates.find(
    (p) =>
      p.name === aliased ||
      clean.includes(p.name) ||
      p.name.includes(clean)
  );
}

/**
 * คำนวณระยะทางเส้นตรง (Great Circle Distance) เป็นกิโลเมตร
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}
