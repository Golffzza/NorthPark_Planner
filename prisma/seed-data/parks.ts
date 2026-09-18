import { parksData } from "./parks-raw";
import { parksData as correctedCoordinates } from "./parksData_corrected_coordinates";

type RawPark = {
  name: string;
  nameEn: string;
  description: string;
  province: string;
  district?: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  entryFeeThai?: number;
  entryFeeForeigner?: number;
  openingHours: string;
  tags?: string[];
};

const curatedOverrides: Record<
  string,
  {
    slug?: string;
    coverImageUrl?: string;
    attractions?: Array<{
      name: string;
      description: string;
      type: "VIEWPOINT" | "WATERFALL" | "TRAIL" | "CAMPSITE" | "OTHER";
      imageUrl?: string;
    }>;
    warnings?: Array<{
      title: string;
      description: string;
      severity: "LOW" | "MEDIUM" | "HIGH";
      isActive: boolean;
    }>;
  }
> = {
  "Khlong Lan National Park": {
    slug: "khlong-lan",
    coverImageUrl: "/images/parks/khlong-lan.jpg",
    attractions: [
      {
        name: "น้ำตกคลองลาน",
        description: "น้ำตกคลองลานขนาดใหญ่สูงกว่า 100 เมตร สายน้ำตกไหลผ่านหน้าผาสูงตระหง่านกลางป่าอุดมสมบูรณ์",
        type: "WATERFALL",
        imageUrl: "/images/parks/khlong-lan.jpg",
      },
    ],
    warnings: [
      {
        title: "ระวังโขดหินลื่นและละอองน้ำ",
        description: "บริเวณหน้าผาน้ำตกมีละอองน้ำกระจายตลอดเวลา ควรระมัดระวังขณะเดินถ่ายภาพ",
        severity: "MEDIUM",
        isActive: true,
      },
    ],
  },
  "Khlong Wang Chao National Park": {
    slug: "khlong-wang-chao",
    coverImageUrl: "/images/parks/khlong-wang-chao.jpg",
    attractions: [
      {
        name: "น้ำตกเต่าดำ",
        description: "น้ำตกขนาดใหญ่ทอดตัวลงมาจากหน้าผาสูงตาดชั้นตระการตา กลางผืนป่าดงดิบสมบูรณ์ของอุทยานแห่งชาติคลองวังเจ้า",
        type: "WATERFALL",
        imageUrl: "/images/parks/khlong-wang-chao.jpg",
      },
      {
        name: "สะพานไม้",
        description: "สะพานแขวนไม้ทอดข้ามลำน้ำคลองวังเจ้า อันเป็นจุดเชื่อมต่อเขตแดนธรรมชาติระหว่าง 2 จังหวัด คือ จังหวัดกำแพงเพชร และจังหวัดตาก",
        type: "VIEWPOINT",
        imageUrl: "/images/attractions/khlong-wang-chao-wooden-bridge.jpg",
      },
    ],
    warnings: [
      {
        title: "เส้นทางไปน้ำตกเต่าดำวิบากและชันสูง (ควรใช้รถ 4WD)",
        description: "เส้นทางเดินทางไปน้ำตกเต่าดำเป็นทางลูกรังวิบาก ลาดชันสูง และขรุขระ รถเก๋งหรือรถขับเคลื่อน 2 ล้อทั่วไปไม่สามารถสัญจรได้ ควรใช้รถขับเคลื่อน 4 ล้อ (4WD) หรือใช้บริการรถท้องถิ่นนำทางของอุทยาน",
        severity: "HIGH",
        isActive: true,
      },
      {
        title: "ระวังน้ำเชี่ยวหลังฝนตก",
        description: "บริเวณลำธารและหน้าผาน้ำตกมีกระแสน้ำแรงในช่วงฤดูฝน ควรปฏิบัติตามป้ายเตือนของเจ้าหน้าที่",
        severity: "HIGH",
        isActive: true,
      },
    ],
  },
  "Mae Wong National Park": {
    slug: "mae-wong",
    coverImageUrl: "/images/parks/mae-wong.jpg",
    attractions: [
      {
        name: "แก่งผาคอย / ลำน้ำแม่วงก์",
        description: "สายน้ำลำธารไหลผ่านโขดหินแก่งหินกลางผืนป่าธรรมชาติอันอุดมสมบูรณ์ของอุทยานแห่งชาติแม่วงก์",
        type: "WATERFALL",
        imageUrl: "/images/parks/mae-wong.jpg",
      },
    ],
    warnings: [
      {
        title: "ระวังกระแสน้ำเชี่ยวช่วงฝนตกหนัก",
        description: "บริเวณแก่งหินและลำธารมีกระแสน้ำไหลแรงในบางช่วงฤดู ควรระมัดระวังขณะลงเล่นน้ำ",
        severity: "HIGH",
        isActive: true,
      },
    ],
  },
  "Doi Inthanon National Park": {
    slug: "doi-inthanon",
    coverImageUrl: "/images/parks/doi-inthanon.jpg",
    attractions: [
      {
        name: "จุดชมวิวกิ่วแม่ปาน",
        description: "จุดชมวิวสันเขาและระเบียงไม้ชมวิวทะเลหมอกยามเช้าอันสวยงามตระการตา บนเส้นทางศึกษาธรรมชาติกิ่วแม่ปาน",
        type: "VIEWPOINT",
        imageUrl: "/images/attractions/kew-mae-pan-viewpoint.jpg",
      },
      {
        name: "น้ำตกวชิรธาร",
        description: "น้ำตกขนาดใหญ่สายน้ำไหลตกจากหน้าผาสูงตระหง่านทอดตัวลงสู่แอ่งน้ำ ท่ามกลางละอองน้ำและป่าธรรมชาติร่มรื่น",
        type: "WATERFALL",
        imageUrl: "/images/attractions/wachirathan-waterfall.jpg",
      },
    ],
    warnings: [
      {
        title: "โขดหินและทางเดินลื่นในช่วงฝนตก",
        description: "เส้นทางเดินศึกษาธรรมชาติและบริเวณใกล้น้ำตกอาจมีความลื่นสูงเมื่อมีฝนตก",
        severity: "MEDIUM",
        isActive: true,
      },
    ],
  },
  "Doi Suthep-Pui National Park": {
    slug: "doi-suthep-pui",
    coverImageUrl: "/images/parks/doi-suthep-pui.jpg",
    attractions: [
      {
        name: "น้ำตกมณฑาธาร",
        description: "น้ำตกธรรมชาติบรรยากาศร่มรื่นกลางผืนป่า เข้าถึงได้สะดวกจากถนนขึ้นดอยสุเทพ",
        type: "WATERFALL",
        imageUrl: "/images/attractions/mon-tha-than.jpg",
      },
    ],
    warnings: [
      {
        title: "เส้นทางขึ้นเขาชันและโค้งคดเคี้ยว",
        description: "ควรขับขี่ด้วยความระมัดระวัง ใช้เกียร์ต่ำ และระวังหมอกหนายามเช้า",
        severity: "MEDIUM",
        isActive: true,
      },
    ],
  },
  "Mae Takhrai National Park": {
    slug: "mae-takhrai",
    coverImageUrl: "/images/parks/mae-takhrai.jpg",
    attractions: [
      {
        name: "ลำน้ำสายห้วยและลานกางเต็นท์แม่ตะไคร้",
        description: "สายน้ำลำธารห้วยไหลผ่านโขดหินกลางผืนป่าร่มรื่น เหมาะแก่การตั้งแคมป์ กางเต็นท์ พักผ่อนท่ามกลางธรรมชาติอันบริสุทธิ์",
        type: "CAMPSITE",
        imageUrl: "/images/attractions/mae-takhrai-stream.jpg",
      },
    ],
    warnings: [
      {
        title: "ระวังน้ำเชี่ยวบริเวณลำธารช่วงฝนตกหนัก",
        description: "สายน้ำและลำธารอาจเพิ่มระดับและไหลเชี่ยวได้รวดเร็วเมื่อเกิดฝนตกหนักสะสม ควรระมัดระวังขณะลงเล่นน้ำหรือตั้งแคมป์ริมน้ำ",
        severity: "MEDIUM",
        isActive: true,
      },
    ],
  },
  "Doi Pha Hom Pok National Park": {
    slug: "doi-pha-hom-pok",
    coverImageUrl: "/images/parks/doi-pha-hom-pok.jpg",
    attractions: [
      {
        name: "ยอดดอยผ้าห่มปก",
        description: "ยอดเขาที่สูงเป็นอันดับ 2 ของประเทศไทย (2,285 เมตร) สัมผัสอากาศหนาวเย็น ชมทะเลหมอกและพระอาทิตย์ขึ้นอันสวยงามตระการตา",
        type: "VIEWPOINT",
        imageUrl: "/images/attractions/doi-pha-hom-pok-peak.jpg",
      },
    ],
    warnings: [
      {
        title: "สภาพอากาศหนาวจัดและอุณหภูมิต่ำ",
        description: "ยอดดอยมีอากาศหนาวเย็นจัดตลอดปี โดยเฉพาะช่วงฤดูหนาว ควรเตรียมเสื้อผ้ากันหนาวและอุปกรณ์ให้พร้อม",
        severity: "MEDIUM",
        isActive: true,
      },
    ],
  },
  "Huai Nam Dang National Park": {
    slug: "huai-nam-dang",
    coverImageUrl: "/images/parks/huai-nam-dang.jpg",
    attractions: [
      {
        name: "จุดชมวิวดอยกิ่วลม (ทะเลหมอกห้วยน้ำดัง)",
        description: "จุดชมวิวทะเลหมอกยามเช้าและพระอาทิตย์ขึ้นอันเลื่องชื่อ มองเห็นทิวเขาสลับซับซ้อนและดอยหลวงเชียงดาวตั้งตระหง่านเหนือทะเลหมอกกว้างไกลสุดสายตา",
        type: "VIEWPOINT",
        imageUrl: "/images/attractions/huai-nam-dang-viewpoint.jpg",
      },
      {
        name: "ลานกางเต็นท์ห้วยน้ำดัง",
        description: "ลานกางเต็นท์บนเนินหญ้าใต้ร่มเงาป่าสนและอากาศหนาวเย็นตลอดปี เหมาะสำหรับการแคมป์ปิ้งพักผ่อน ชมดาวยามค่ำคืน และตื่นมารับทะเลหมอกยามเช้า",
        type: "CAMPSITE",
        imageUrl: "/images/attractions/huai-nam-dang-camp.jpg",
      },
    ],
    warnings: [
      {
        title: "ทัศนวิสัยต่ำในตอนเช้าตรู่",
        description: "หมอกหนาอาจลดทัศนวิสัยบนเส้นทางขับรถและจุดชมวิว ควรเปิดไฟส่องสว่างขณะเดินทาง",
        severity: "HIGH",
        isActive: true,
      },
    ],
  },
  "Sri Lanna National Park": {
    slug: "si-lanna",
    coverImageUrl: "/images/parks/si-lanna.jpg",
    attractions: [
      {
        name: "สกายวอล์กเขื่อนแม่งัด",
        description: "สะพานกระจกใสยื่นออกสู่ผืนน้ำของอ่างเก็บน้ำเขื่อนแม่งัดสมบูรณ์ชล เปิดมุมมองชมทัศนียภาพทะเลสาบและขุนเขาแบบพาโนรามา",
        type: "VIEWPOINT",
        imageUrl: "/images/attractions/mae-ngat-skywalk.jpg",
      },
    ],
    warnings: [
      {
        title: "สวมเสื้อชูชีพทุกครั้งเมื่อทำกิจกรรมทางน้ำ",
        description: "เพื่อความปลอดภัยในการท่องเที่ยวและกิจกรรมทางน้ำหรือนั่งเรือ ควรปฏิบัติตามคำแนะนำของเจ้าหน้าที่และสวมชูชีพตลอดเวลา",
        severity: "MEDIUM",
        isActive: true,
      },
    ],
  },
  "Khun Khan National Park": {
    slug: "khun-khan",
    coverImageUrl: "/images/parks/khun-khan.jpg",
    attractions: [
      {
        name: "จุดชมวิวสะเมิง",
        description: "จุดชมวิวบนสันเขาอำเภอสะเมิง มองเห็นทิวเขาซับซ้อนสลับซับซ้อนกว้างไกลสุดสายตาท่ามกลางผืนป่าดงดิบอันอุดมสมบูรณ์",
        type: "VIEWPOINT",
        imageUrl: "/images/attractions/samoeng-viewpoint.jpg",
      },
    ],
    warnings: [
      {
        title: "เส้นทางขึ้นเขาคดเคี้ยวและสูงชัน",
        description: "เส้นทางสู่จุดชมวิวสะเมิงเป็นถนนสายภูเขาคดเคี้ยวและลาดชัน ควรขับขี่ด้วยความระมัดระวังและใช้เกียร์ต่ำ",
        severity: "MEDIUM",
        isActive: true,
      },
    ],
  },
  "Mae Yom National Park": {
    slug: "mae-yom",
    coverImageUrl: "/images/parks/mae-yom.jpg",
    attractions: [
      {
        name: "แก่งเสือเต้น",
        description: "แก่งหินธรรมชาติริมแม่น้ำยม ทัศนียภาพสายน้ำและสะพานไม้ทอดข้ามลำธาร ท่ามกลางผืนป่าสักธรรมชาติอันอุดมสมบูรณ์",
        type: "VIEWPOINT",
        imageUrl: "/images/attractions/kaeng-suea-ten.jpg",
      },
      {
        name: "ดงสักงาม",
        description: "ผืนป่าสักทองธรรมชาติผืนใหญ่และสมบูรณ์ที่สุดแห่งหนึ่งของประเทศไทย ทิวทัศน์เรือนยอดไม้สักทองแผ่กิ่งก้านเขียวชอุ่มกว้างไกลสุดสายตา",
        type: "VIEWPOINT",
        imageUrl: "/images/attractions/dong-sak-ngam.jpg",
      },
    ],
    warnings: [
      {
        title: "ระวังกระแสน้ำเชี่ยวช่วงฤดูน้ำหลาก",
        description: "บริเวณแก่งเสือเต้นและลำน้ำยมอาจมีกระแสน้ำไหลแรงและระดับน้ำขึ้นสูงเฉียบพลันหลังฝนตกหนัก",
        severity: "HIGH",
        isActive: true,
      },
      {
        title: "ระวังลื่นบนโขดหินและสะพานไม้",
        description: "ควรใช้ความระมัดระวังขณะเดินข้ามสะพานไม้หรือบนโขดหินริมลำน้ำที่มีความลื่นและชื้น",
        severity: "MEDIUM",
        isActive: true,
      },
    ],
  },
  "Mae Wang National Park": {
    slug: "mae-wang",
    coverImageUrl: "/images/parks/mae-wang.jpg",
    attractions: [
      {
        name: "ผาช่อ",
        description: "ปรากฏการณ์ธรรมชาติหน้าผาดินตะกอนและเสาดินสูงกว่า 30 เมตร เกิดจากการกัดเซาะตามธรรมชาติของลมฝนจนกลายเป็นประติมากรรมดินสุดอลังการ ได้รับฉายาแกรนด์แคนยอนเมืองไทย",
        type: "VIEWPOINT",
        imageUrl: "/images/attractions/pha-chor.jpg",
      },
      {
        name: "น้ำตกแม่วาง",
        description: "น้ำตกธรรมชาติบรรยากาศเย็นสบาย รายล้อมด้วยผืนป่าเบญจพรรณอันสมบูรณ์",
        type: "WATERFALL",
        imageUrl: "/images/attractions/mae-wang-waterfall.jpg",
      },
    ],
    warnings: [
      {
        title: "ระวังกระแสน้ำเชี่ยวช่วงฝนตกหนัก",
        description: "ระดับน้ำในลำธารสามารถเพิ่มสูงขึ้นอย่างรวดเร็วในช่วงฝนตกหนัก ติดตามป้ายเตือนอย่างใกล้ชิด",
        severity: "HIGH",
        isActive: true,
      },
    ],
  },
  "Ob Luang National Park": {
    slug: "ob-luang",
    coverImageUrl: "/images/parks/ob-luang.jpg",
    attractions: [
      {
        name: "สะพานเชื่อมโตรกเขาออบหลวง",
        description: "จุดชมวิวโตรกผาหินแคบอันเป็นเอกลักษณ์ พร้อมสายน้ำแม่แจ่มไหลผ่านเบื้องล่าง",
        type: "VIEWPOINT",
        imageUrl: "/images/attractions/ob-luang-gorge.jpg",
      },
    ],
    warnings: [
      {
        title: "ระมัดระวังการเดินบริเวณริมหน้าผา",
        description: "จุดชมวิวบางแห่งมีความสูงชัน ควรดูแลเด็กเล็กและผู้สูงอายุอย่างใกล้ชิด",
        severity: "MEDIUM",
        isActive: true,
      },
    ],
  },
  "Mae Ping National Park": {
    slug: "mae-ping",
    coverImageUrl: "/images/parks/mae-ping.jpg",
    attractions: [
      {
        name: "จุดชมวิวผาแดงหลวง",
        description: "จุดชมวิวหน้าผาสูงตระหง่าน ชมทัศนียภาพคุ้งน้ำแม่น้ำปิงและทะเลสาบแก่งก้อแบบพาโนรามา พร้อมวิวพระอาทิตย์ตกดินและยามเช้าอันงดงามตระการตา",
        type: "VIEWPOINT",
        imageUrl: "/images/attractions/pha-daeng-luang.jpg",
      },
      {
        name: "น้ำตกก้อหลวง",
        description: "น้ำตกหินปูน 7 ชั้นที่มีสายน้ำไหลตกลงสู่แอ่งน้ำขนาดใหญ่สีฟ้าอมเขียวมรกตใสสะอาด รายล้อมด้วยหน้าผาหินปูนและพันธุ์ไม้ร่มรื่น",
        type: "WATERFALL",
        imageUrl: "/images/attractions/ko-luang.jpg",
      },
      {
        name: "แก่งก้อ",
        description: "เวิ้งน้ำทะเลสาบเหนือเขื่อนภูมิพลอันกว้างใหญ่ โอบล้อมด้วยขุนเขาสลับซับซ้อน เป็นศูนย์กลางการท่องเที่ยวทางน้ำ จุดชมวิวทัศนียภาพริมน้ำ ล่องเรือ และพักผ่อนเรือนแพ",
        type: "VIEWPOINT",
        imageUrl: "/images/attractions/kaeng-ko.jpg",
      },
    ],
    warnings: [
      {
        title: "หน้าผาสูงชันและเส้นทางเดินป่า",
        description: "บริเวณจุดชมวิวผาแดงหลวงเป็นหน้าผาสูงชัน ควรใช้ความระมัดระวังและไม่เข้าใกล้ขอบหน้าผาเกินแนวที่กำหนด",
        severity: "HIGH",
        isActive: true,
      },
      {
        title: "สวมเสื้อชูชีพทุกครั้งเมื่อทำกิจกรรมทางน้ำ",
        description: "เพื่อความปลอดภัยในการล่องเรือหรือทำกิจกรรมบริเวณแก่งก้อและน้ำตกก้อหลวง ควรปฏิบัติตามคำแนะนำของเจ้าหน้าที่",
        severity: "MEDIUM",
        isActive: true,
      },
    ],
  },
  "Ramkhamhaeng National Park": {
    slug: "ramkhamhaeng",
    coverImageUrl: "/images/parks/ramkhamhaeng.jpg",
    attractions: [
      {
        name: "ผานารายณ์ (ยอดเขาหลวง)",
        description: "จุดชมวิวหน้าผาหินยื่นโดดเด่นบนยอดเขาหลวงสุโขทัย สูง 1,200 เมตรจากระดับน้ำทะเล ชมทะเลหมอกยามเช้า ทิวทัศน์เมืองสุโขทัย และพระอาทิตย์ขึ้นอันงดงาม",
        type: "VIEWPOINT",
        imageUrl: "/images/attractions/pha-narai.jpg",
      },
      {
        name: "ยอดเขาหลวง (ผู้พิชิตความสูง 1,200 ม.)",
        description: "จุดชมวิวป้ายผู้พิชิตยอดเขาหลวงสุโขทัย ความสูง 1,200 เมตรจากระดับน้ำทะเล มองเห็นทัศนียภาพมุมสูงของเทือกเขาหลวง ผืนป่า และตัวเมืองสุโขทัยแบบพาโนรามา",
        type: "VIEWPOINT",
        imageUrl: "/images/attractions/khao-luang-peak.jpg",
      },
      {
        name: "น้ำตกสายรุ้ง",
        description: "น้ำตกสูงใหญ่สวยงาม 4 ชั้น ทอดตัวลงมาจากหน้าผาสูงชันทางทิศตะวันตกของเขาหลวง ในช่วงบ่ายเมื่อแสงแดดส่องกระทบละอองน้ำจะเกิดเป็นประกายรุ้งกินน้ำงดงามตระการตา",
        type: "WATERFALL",
        imageUrl: "/images/attractions/sai-rung-waterfall.jpg",
      },
    ],
    warnings: [
      {
        title: "เส้นทางเดินเท้าขึ้นเขาหลวงลาดชันสูง",
        description: "เส้นทางเดินขึ้นยอดเขาหลวงมีความชันต่อเนื่องตลอด 3.7 กิโลเมตร ควรเตรียมความพร้อมของร่างกาย สวมรองเท้าเดินป่า และพกน้ำดื่มให้เพียงพอ",
        severity: "HIGH",
        isActive: true,
      },
      {
        title: "ระวังหน้าผาสูงชันและลมกรรโชกแรง",
        description: "บริเวณผานารายณ์และแนวสันเขามีลมพัดแรงและเป็นหน้าผาสูงชัน ห้ามยืนชิดขอบหน้าผาเกินแนวกำหนด",
        severity: "MEDIUM",
        isActive: true,
      },
    ],
  },
  "Si Satchanalai National Park": {
    slug: "si-satchanalai",
    coverImageUrl: "/images/parks/si-satchanalai.jpg",
    attractions: [
      {
        name: "น้ำตกตาดดาว",
        description: "น้ำตกขนาดใหญ่สูงกว่า 50 เมตร สายน้ำคู่ไหลตกจากหน้าผาสูงชันลงสู่แอ่งน้ำเบื้องล่าง ท่ามกลางผืนป่าดงดิบแล้งและพันธุ์ไม้ร่มรื่นอุดมสมบูรณ์",
        type: "WATERFALL",
        imageUrl: "/images/attractions/tat-dao-waterfall.jpg",
      },
      {
        name: "น้ำตกตาดเดือน",
        description: "น้ำตกสายน้ำไหลผ่านลานหินกว้างและแอ่งน้ำใสท่ามกลางโขดหินธรรมชาติ บรรยากาศร่มรื่นใต้ร่มไม้ เหมาะสำหรับการพักผ่อนริมลำธาร",
        type: "WATERFALL",
        imageUrl: "/images/attractions/tat-duean-waterfall.jpg",
      },
      {
        name: "ถ้ำธาราวสันต์",
        description: "ถ้ำหินปูนธรรมชาติขนาดใหญ่ ภายในประดับประดาด้วยหินงอกหินย้อยสีทองระยิบระยับตระการตา มีธารน้ำไหลผ่านและมีค้างคาวอาศัยอยู่เป็นจำนวนมาก",
        type: "OTHER",
        imageUrl: "/images/attractions/tham-thara-wasan.jpg",
      },
    ],
    warnings: [
      {
        title: "ระวังโขดหินลื่นบริเวณน้ำตก",
        description: "บริเวณลานหินและโขดหินใกล้น้ำตกมีตะไคร่น้ำเกาะและมีความลื่นสูง ควรใช้ความระมัดระวังขณะเดิน",
        severity: "MEDIUM",
        isActive: true,
      },
      {
        title: "ระวังกระแสน้ำป่าช่วงฝนตกหนัก",
        description: "ในฤดูฝนหรือช่วงมีฝนตกหนักสะสมในพื้นที่ต้นน้ำ ควรสังเกตสีน้ำและปฏิบัติตามคำเตือนของเจ้าหน้าที่",
        severity: "HIGH",
        isActive: true,
      },
    ],
  },
  "Khun Chae National Park": {
    slug: "khun-chae",
    coverImageUrl: "/images/parks/khun-chae.jpg",
    attractions: [
      {
        name: "น้ำตกขุนแจ",
        description: "น้ำตกขนาดใหญ่สวยงามซ่อนตัวอยู่กลางผืนป่าดิบเขา มีเส้นทางเดินศึกษาธรรมชาติร่มรื่น",
        type: "WATERFALL",
        imageUrl: "/images/attractions/khun-chae-waterfall.jpg",
      },
      {
        name: "จุดชมวิวดอยม่อนฝิ่น / ทะเลหมอกขุนแจ",
        description: "จุดชมวิวทิวทัศน์ทะเลหมอกและพระอาทิตย์ตกดินยามเย็นอันสวยงามบนยอดเขาของอุทยานแห่งชาติขุนแจ",
        type: "VIEWPOINT",
        imageUrl: "/images/attractions/doi-mon-fin.jpg",
      },
    ],
    warnings: [
      {
        title: "พื้นที่จอดรถริมทางมีจำนวนจำกัด",
        description: "ควรวางแผนเวลาเดินทางและช่วงเวลามาถึงให้รอบคอบโดยเฉพาะในช่วงเทศกาลท่องเที่ยว",
        severity: "LOW",
        isActive: true,
      },
      {
        title: "หมอกหนาและเส้นทางขับขี่ลาดชัน",
        description: "เส้นทางขับรถขึ้นจุดชมวิวมีความลาดชันและอาจมีหมอกหนาในตอนเช้าและเย็น ควรขับขี่ด้วยความระมัดระวัง",
        severity: "MEDIUM",
        isActive: true,
      },
    ],
  },
  "Doi Luang National Park": {
    slug: "doi-luang",
    coverImageUrl: "/images/parks/doi-luang.jpg",
    attractions: [
      {
        name: "น้ำตกปูแกง",
        description: "น้ำตกหินปูนหลายชั้นอันสวยงาม สายน้ำใสไหลผ่านตาดหินและผืนป่าธรรมชาติอันร่มรื่นของอุทยานแห่งชาติดอยหลวง",
        type: "WATERFALL",
        imageUrl: "/images/attractions/pu-kaeng-waterfall.jpg",
      },
      {
        name: "น้ำตกจำปาทอง",
        description: "น้ำตกสวยงามที่มีสายน้ำไหลลงมาจากหน้าผาสูง รายล้อมด้วยโขดหินและธรรมชาติอุดมสมบูรณ์",
        type: "WATERFALL",
        imageUrl: "/images/attractions/champa-thong-waterfall.jpg",
      },
    ],
    warnings: [
      {
        title: "โขดหินลื่นและระดับน้ำสูงช่วงฤดูฝน",
        description: "บริเวณหน้าผาน้ำตกและโขดหินมีคราบตะไคร่น้ำและกระแสน้ำไหลเชี่ยวในบางช่วง ควรเดินด้วยความระมัดระวัง",
        severity: "MEDIUM",
        isActive: true,
      },
    ],
  },
  "Doi Soi Malai National Park": {
    slug: "doi-soi-malai",
    coverImageUrl: "/images/parks/doi-soi-malai.jpg",
    attractions: [
      {
        name: "ยอดดอยสอยมาลัย (หลังคาเมืองตาก)",
        description: "จุดชมวิวยอดดอยและแนวสันเขาความสูง 1,665 เมตรจากระดับน้ำทะเล สัมผัสอากาศหนาวเย็น ชมทะเลหมอกและทัศนียภาพขุนเขากว้างไกลสุดสายตา",
        type: "VIEWPOINT",
        imageUrl: "/images/attractions/doi-soi-malai-peak.jpg",
      },
      {
        name: "วนอุทยานไม้กลายเป็นหิน",
        description: "แหล่งซากดึกดำบรรพ์ไม้กลายเป็นหินที่ยาวที่สุดในโลกและใหญ่ที่สุดในเอเชียตะวันออกเฉียงใต้ มีคุณค่าทางธรณีวิทยาและธรรมชาติศึกษา",
        type: "OTHER",
        imageUrl: "/images/attractions/petrified-wood.jpg",
      },
    ],
    warnings: [
      {
        title: "เส้นทางขึ้นยอดดอยเป็นทางวิบากและลาดชันสูง (ต้องใช้รถ 4WD)",
        description: "เส้นทางขึ้นสู่ยอดดอยสอยมาลัยเป็นทางลูกรังวิบาก ลาดชันสูง และเป็นร่องหินขรุขระ ต้องใช้รถขับเคลื่อน 4 ล้อ (4WD) สภาพสมบูรณ์และขับขี่ด้วยความระมัดระวัง",
        severity: "HIGH",
        isActive: true,
      },
      {
        title: "สภาพอากาศหนาวจัดและลมแรงบนสันเขา",
        description: "บริเวณยอดดอยและสันเขามีลมพัดแรงตลอดเวลาและมีอากาศหนาวจัดในฤดูหนาว ควรเตรียมเสื้อผ้ากันหนาวและอุปกรณ์แคมป์ปิ้งให้พร้อม",
        severity: "MEDIUM",
        isActive: true,
      },
    ],
  },
  "Taksin Maharat National Park": {
    slug: "taksin-maharat",
    coverImageUrl: "/images/parks/taksin-maharat.jpg",
    attractions: [
      {
        name: "จุดชมวิวทะเลหมอกและป่าสนเขา",
        description: "จุดชมวิวทะเลหมอกยามเช้าและระเบียงชมพระอาทิตย์ขึ้น ท่ามกลางร่มเงาของป่าสนเขตร้อนและอากาศบริสุทธิ์เย็นสบายตลอดปี",
        type: "VIEWPOINT",
        imageUrl: "/images/attractions/taksin-maharat-viewpoint.jpg",
      },
      {
        name: "ต้นกระบากใหญ่ (ต้นไม้ใหญ่ที่สุดในไทย)",
        description: "ต้นกระบากยักษ์อายุกว่า 700 ปี มีขนาดเส้นรอบวงลำต้นกว่า 16 เมตร สูงตระหง่านราว 50 เมตร ถือเป็นต้นไม้ที่ใหญ่ที่สุดในประเทศไทย",
        type: "TRAIL",
        imageUrl: "/images/attractions/krabak-yai.jpg",
      },
      {
        name: "สะพานหินธรรมชาติ",
        description: "ประติมากรรมหินทรายธรรมชาติที่เชื่อมระหว่างหน้าผาสองฝั่ง มีลำห้วยไหลลอดผ่านเบื้องล่างอย่างสวยงามแปลกตา",
        type: "OTHER",
        imageUrl: "/images/attractions/natural-stone-bridge.jpg",
      },
    ],
    warnings: [
      {
        title: "หมอกหนาและเส้นทางขับขี่บนเขาลาดชัน",
        description: "ถนนทางหลวงและทางเข้าอุทยานมีความลาดชันและอาจมีหมอกหนาในตอนเช้า ควรเปิดไฟส่องสว่างและขับขี่ด้วยความระมัดระวัง",
        severity: "MEDIUM",
        isActive: true,
      },
      {
        title: "เส้นทางเดินลงชมต้นกระบากใหญ่มีความลาดชันสูง",
        description: "ทางเดินศึกษาธรรมชาติลงสู่หุบเขาต้นกระบากใหญ่เป็นบันไดลาดชัน ควรเตรียมรองเท้าเดินป่าที่ยึดเกาะดีและเดินด้วยความระมัดระวัง",
        severity: "MEDIUM",
        isActive: true,
      },
    ],
  },
  "Namtok Pha Charoen National Park": {
    slug: "namtok-pha-charoen",
    coverImageUrl: "/images/parks/namtok-pha-charoen.jpg",
    attractions: [
      {
        name: "น้ำตกพาเจริญ",
        description: "น้ำตกหินปูนธรรมชาติขนาดใหญ่ ไหลลดหลั่นเป็นชั้นเล็กชั้นน้อยลงมาถึง 97 ชั้น ท่ามกลางบรรยากาศร่มรื่นของป่าดิบเขาอันอุดมสมบูรณ์",
        type: "WATERFALL",
        imageUrl: "/images/attractions/pha-charoen-waterfall.jpg",
      },
      {
        name: "ทุ่งดอกกระเจียวสีส้ม",
        description: "ทุ่งดอกกระเจียวสีส้ม (ดอกกระเจียวป่า) ผลิบานสะพรั่งงดงามตระการตาในช่วงฤดูฝน (กรกฎาคม - ตุลาคม)",
        type: "VIEWPOINT",
        imageUrl: "/images/attractions/orange-curcuma.jpg",
      },
      {
        name: "บ่อน้ำร้อนห้วยน้ำนัก",
        description: "บ่อน้ำแร่ธรรมชาติอุณหภูมิประมาณ 60 องศาเซลเซียส ไม่มีกลิ่นกำมะถัน เหมาะสำหรับการแช่น้ำแร่เพื่อสุขภาพและผ่อนคลาย",
        type: "OTHER",
        imageUrl: "/images/attractions/huai-nam-nak-hotspring.jpg",
      },
    ],
    warnings: [
      {
        title: "ระวังโขดหินลื่นและคราบตะไคร่น้ำบริเวณชั้นน้ำตก",
        description: "บริเวณหน้าผาและโขดหินปูนอาจมีตะไคร่น้ำเกาะและมีความลื่น ควรใช้ความระมัดระวังเป็นพิเศษขณะเดินชมหรือถ่ายภาพ",
        severity: "MEDIUM",
        isActive: true,
      },
      {
        title: "ระวังปริมาณน้ำและกระแสน้ำหลากช่วงฤดูฝน",
        description: "ในช่วงที่มีฝนตกหนักสะสม ระดับน้ำอาจเพิ่มขึ้นและมีสีขุ่น ควรปฏิบัติตามคำแนะนำและป้ายเตือนของเจ้าหน้าที่อุทยานอย่างเคร่งครัด",
        severity: "HIGH",
        isActive: true,
      },
    ],
  },
  "Mae Moei National Park": {
    slug: "mae-moei",
    coverImageUrl: "/images/parks/mae-moei.jpg",
    attractions: [
      {
        name: "จุดชมวิวทะเลหมอกม่อนกิ่วลม",
        description: "จุดชมวิวทะเลหมอกยามเช้าและพระอาทิตย์ขึ้นอันเลื่องชื่อ ชมทัศนียภาพทะเลหมอกหนาทึบแผ่คลุมเหนือทิวเขาสลับซับซ้อนกว้างไกลสุดสายตา",
        type: "VIEWPOINT",
        imageUrl: "/images/attractions/mon-kiew-lom-sea-of-mist.jpg",
      },
      {
        name: "ม่อนครูบาใส และ ม่อนพูนสุดา",
        description: "จุดชมวิวทะเลหมอกและพระอาทิตย์ตกดินยามเย็นที่สวยงาม เหมาะสำหรับการกางเต็นท์พักผ่อนสัมผัสอากาศบริสุทธิ์และหนาวเย็น",
        type: "CAMPSITE",
        imageUrl: "/images/attractions/mon-krubasai.jpg",
      },
    ],
    warnings: [
      {
        title: "เส้นทางขึ้นเขาสูงชัน คดเคี้ยว และอาจมีหมอกหนาจัด",
        description: "ทางขึ้นอุทยานแห่งชาติแม่เมยและจุดชมวิวม่อนต่างๆ มีความลาดชันและโค้งคดเคี้ยว ควรขับขี่ด้วยความระมัดระวัง ใช้เกียร์ต่ำ และเปิดไฟส่องสว่าง",
        severity: "MEDIUM",
        isActive: true,
      },
      {
        title: "สภาพอากาศหนาวจัดและลมพัดแรงบนยอดม่อน",
        description: "ช่วงฤดูหนาวบนจุดชมวิวและลานกางเต็นท์มีอุณหภูมิต่ำมากและมีลมแรง ควรเตรียมเสื้อผ้ากันหนาวและอุปกรณ์แคมป์ปิ้งให้พร้อม",
        severity: "LOW",
        isActive: true,
      },
    ],
  },
  "Lan Sang National Park": {
    slug: "lan-sang",
    coverImageUrl: "/images/parks/lan-sang.jpg",
    attractions: [
      {
        name: "น้ำตกลานสาง",
        description: "น้ำตกธรรมชาติสายน้ำไหลผ่านซอกหินและโขดผาสูงชันลงสู่แอ่งน้ำ ท่ามกลางร่มเงาของป่าดิบแล้งและป่าเบญจพรรณอันสมบูรณ์",
        type: "WATERFALL",
        imageUrl: "/images/attractions/lan-sang-waterfall.jpg",
      },
    ],
    warnings: [
      {
        title: "ห้ามปีนป่ายหน้าผาและระวังโขดหินลื่น",
        description: "บริเวณหน้าผาและโขดหินน้ำตกมีคราบตะไคร่น้ำและความลาดชันสูง ห้ามปีนป่ายนอกเส้นทางและควรปฏิบัติตามป้ายเตือนความปลอดภัยอย่างเคร่งครัด",
        severity: "HIGH",
        isActive: true,
      },
      {
        title: "ระวังระดับน้ำเพิ่มสูงขึ้นฉับพลันหลังฝนตก",
        description: "ลำธารและแอ่งน้ำตกอาจมีกระแสน้ำแรงและสีขุ่นช่วงฤดูฝน ให้สังเกตสัญญาณเตือนจากเจ้าหน้าที่อุทยาน",
        severity: "MEDIUM",
        isActive: true,
      },
    ],
  },
  "Khun Nan National Park": {
    slug: "khun-nan",
    coverImageUrl: "/images/parks/khun-nan.jpg",
    attractions: [
      {
        name: "จุดชมวิวดอยขุนน่าน และ ทะเลหมอกขุนน่าน",
        description: "จุดชมวิวทิวทัศน์แนวทิวเขาสลับซับซ้อน ทะเลหมอกยามเช้า และแสงอาทิตย์อัสดงอันงดงามกลางผืนป่าต้นน้ำน่านอันบริสุทธิ์",
        type: "VIEWPOINT",
        imageUrl: "/images/attractions/khun-nan-viewpoint.jpg",
      },
      {
        name: "น้ำตกสะปัน",
        description: "น้ำตกธรรมชาติขนาดกลาง 3 ชั้นในหมู่บ้านสะปัน สายน้ำใสเย็นไหลตลอดปีท่ามกลางธรรมชาติร่มรื่น",
        type: "WATERFALL",
        imageUrl: "/images/attractions/sapan-waterfall.jpg",
      },
    ],
    warnings: [
      {
        title: "เส้นทางขับขี่บนเขาสูงชันและโค้งพับผ้า",
        description: "เส้นทางสู่อำเภอบ่อเกลือและอุทยานแห่งชาติขุนน่านเป็นทางภูเขาสูงชัน คดเคี้ยว ควรใช้เกียร์ต่ำและขับขี่ด้วยความระมัดระวัง",
        severity: "HIGH",
        isActive: true,
      },
      {
        title: "สภาพอากาศหนาวเย็นและหมอกหนายามเช้า",
        description: "บริเวณยอดดอยและลานกางเต็นท์มีอากาศหนาวเย็นตลอดปี ควรเตรียมเครื่องนุ่งห่มกันหนาวให้เพียงพอ",
        severity: "LOW",
        isActive: true,
      },
    ],
  },
  "Doi Phu Kha National Park": {
    slug: "doi-phu-kha",
    coverImageUrl: "/images/parks/doi-phu-kha.jpg",
    attractions: [
      {
        name: "จุดชมวิว 1715 และ เส้นทางถนนลอยฟ้า",
        description: "จุดชมวิวบนสันเขาความสูง 1,715 เมตรจากระดับน้ำทะเล มองเห็นทัศนียภาพทิวเขาสลับซับซ้อน ป่าต้นน้ำ และทะเลหมอกอันงดงามตระการตา",
        type: "VIEWPOINT",
        imageUrl: "/images/attractions/doi-phu-kha-viewpoint.jpg",
      },
      {
        name: "ต้นชมพูภูคา (พันธุ์ไม้หายากหนึ่งเดียวในโลก)",
        description: "พันธุ์ไม้หายากระดับโลกที่หลงเหลืออยู่เพียงแห่งเดียวในประเทศไทย ผลิดอกสีชมพูบานสะพรั่งเป็นช่อสวยงามในช่วงเดือนกุมภาพันธ์ - มีนาคม",
        type: "TRAIL",
        imageUrl: "/images/attractions/chompoo-phu-kha.jpg",
      },
      {
        name: "ลานดูดาวและลานกางเต็นท์ดอยภูคา",
        description: "จุดกางเต็นท์สัมผัสลมหนาว ชมดาวระยิบระยับยามค่ำคืน และตื่นมารับสายหมอกยามเช้า",
        type: "CAMPSITE",
        imageUrl: "/images/attractions/doi-phu-kha-stargazing.jpg",
      },
    ],
    warnings: [
      {
        title: "เส้นทางขับขี่บนเขาสูงชันและโค้งคดเคี้ยวอันตราย",
        description: "ถนนทางหลวง 1081 และ 1256 (ถนนลอยฟ้า) มีความลาดชันและโค้งพับผ้าสูง ควรตรวจเช็คระบบเบรก ใช้เกียร์ต่ำ และไม่ขับขี่เร็ว",
        severity: "HIGH",
        isActive: true,
      },
      {
        title: "สภาพอากาศหนาวจัดและลมกรรโชกแรง",
        description: "บริเวณยอดดอยมีความสูงเกือบ 2,000 เมตร อุณหภูมิลดต่ำมากในฤดูหนาว ควรเตรียมเสื้อผ้ากันหนาวให้พร้อม",
        severity: "MEDIUM",
        isActive: true,
      },
    ],
  },
  "Nanthaburi National Park": {
    slug: "nanthaburi",
    coverImageUrl: "/images/parks/nanthaburi.jpg",
    attractions: [
      {
        name: "จุดชมวิวยอดดอยวาว (ทะเลหมอกและพระอาทิตย์ขึ้น-ตก)",
        description: "จุดชมวิวยอดดอยวาว ความสูง 1,674 เมตรจากระดับน้ำทะเล ชมทะเลหมอก 360 องศาอันตระการตา และวิวทิวเขาสลับซับซ้อนยามพระอาทิตย์ขึ้นและตก",
        type: "VIEWPOINT",
        imageUrl: "/images/parks/nanthaburi.jpg",
      },
      {
        name: "จุดชมวิวยอดผาช้าง",
        description: "จุดชมวิวความสูง 1,275 เมตรจากระดับน้ำทะเล จุดชมพระอาทิตย์ตกดินและตะวันลับฟ้าอันงดงาม พร้อมทัศนียภาพทิวเขาสลับซับซ้อนและทะเลหมอกเมืองน่าน",
        type: "VIEWPOINT",
        imageUrl: "/images/attractions/pha-chang-viewpoint.jpg",
      },
      {
        name: "น้ำตกสันติสุข",
        description: "น้ำตกธรรมชาติสายน้ำไหลตกจากหน้าผาหินลงสู่แอ่งน้ำใส ท่ามกลางผืนป่าดงดิบเขาอันร่มรื่นและเงียบสงบ",
        type: "WATERFALL",
        imageUrl: "/images/attractions/santisuk-waterfall.jpg",
      },
      {
        name: "ลานกางเต็นท์ดอยวาว",
        description: "จุดกางเต็นท์สัมผัสอากาศหนาวเย็น ชมทะเลดาวระยิบระยับยามค่ำคืน และตื่นรับสายหมอกยามเช้าพร้อมทัศนียภาพขุนเขา",
        type: "CAMPSITE",
        imageUrl: "/images/attractions/doi-wao-campsite.jpg",
      },
    ],
    warnings: [
      {
        title: "เส้นทางขึ้นดอยสูงชันและคดเคี้ยว",
        description: "ถนนทางขึ้นสู่ยอดดอยวาวและที่ทำการอุทยานฯ มีความลาดชันสูงและแคบ ควรใช้ความระมัดระวังและใช้เกียร์ต่ำในการขับขี่",
        severity: "HIGH",
        isActive: true,
      },
      {
        title: "สภาพอากาศหนาวจัดและลมแรงบนยอดดอย",
        description: "ช่วงฤดูหนาวอุณหภูมิบนยอดดอยวาวลดต่ำมาก ควรเตรียมเครื่องกันหนาวให้พร้อมสำหรับการพักแรม",
        severity: "MEDIUM",
        isActive: true,
      },
    ],
  },
  "Mae Charim National Park": {
    slug: "mae-charim",
    coverImageUrl: "/images/parks/mae-charim.jpg",
    attractions: [
      {
        name: "จุดชมทิวทัศน์ริมลำน้ำว้า และแก่งหินธรรมชาติ",
        description: "สายน้ำใสสะอาดของลำน้ำว้าไหลคดเคี้ยวผ่านโขดหินแก่งหินธรรมชาติและแนวขุนเขาเขียวชอุ่ม จุดพักผ่อนชมธรรมชาติและเริ่มต้นล่องแพ",
        type: "VIEWPOINT",
        imageUrl: "/images/parks/mae-charim.jpg",
      },
      {
        name: "กิจกรรมล่องแก่งลำน้ำว้า",
        description: "กิจกรรมล่องแก่งเรือยางระดับโลกบนสายน้ำว้า ผจญภัยผ่านเกาะแก่งหินธรรมชาติและสายน้ำเชี่ยว ท่ามกลางทิวเขาและผืนป่าดงดิบสมบูรณ์ของเมืองน่าน",
        type: "OTHER",
        imageUrl: "/images/attractions/nam-wa-river-rafting.jpg",
      },
      {
        name: "ลานกางเต็นท์แม่จริม (ริมลำน้ำว้า)",
        description: "จุดกางเต็นท์พักแรมท่ามกลางทัศนียภาพขุนเขาเขียวชอุ่มและสายหมอก รับลมเย็นบริสุทธิ์และฟังเสียงสายน้ำว้าอันเงียบสงบ",
        type: "CAMPSITE",
        imageUrl: "/images/attractions/mae-charim-campsite.jpg",
      },
    ],
    warnings: [
      {
        title: "ระวังกระแสน้ำเชี่ยวและน้ำป่าไหลหลากในฤดูฝน",
        description: "ช่วงฤดูฝนระดับน้ำในลำน้ำว้าอาจสูงขึ้นอย่างรวดเร็วและมีกระแสน้ำแรง ผู้ร่วมกิจกรรมล่องแก่งต้องสวมเสื้อชูชีพและปฏิบัติตามคำแนะนำของเจ้าหน้าที่อย่างเคร่งครัด",
        severity: "HIGH",
        isActive: true,
      },
      {
        title: "เตรียมอุปกรณ์กันน้ำสำหรับการล่องแก่ง",
        description: "การทำกิจกรรมล่องแก่งและล่องแพอาจทำให้สัมภาระเปียกน้ำได้ ควรเตรียมกระเป๋ากันน้ำและอุปกรณ์ป้องกันให้พร้อม",
        severity: "LOW",
        isActive: true,
      },
    ],
  },
  "Sri Nan National Park": {
    slug: "sri-nan",
    coverImageUrl: "/images/parks/sri-nan.jpg",
    attractions: [
      {
        name: "ดอยเสมอดาว และ ผาหัวสิงห์ (ทะเลหมอกและจุดชมวิว 360 องศา)",
        description: "ลานชมทัศนียภาพกว้างไกลบนยอดเขา ชมทะเลหมอกและแสงแรกยามพระอาทิตย์ขึ้นสุดอลังการ วิวทิวเขาผาหัวสิงห์ 360 องศา และจุดชมดาวระยิบระยับยามค่ำคืน",
        type: "VIEWPOINT",
        imageUrl: "/images/attractions/doi-samer-dao.jpg",
      },
      {
        name: "ผาชู้ และ สายธงชาติ (สายธงชาติที่ยาวที่สุดในประเทศไทย)",
        description: "จุดชมวิวหน้าผาสูงตระหง่าน มองเห็นทัศนียภาพโค้งลำน้ำน่านและทะเลหมอกยามเช้า และเป็นที่ตั้งของเสาธงชาติที่มีสายเชือกชักธงยาวที่สุดในประเทศไทย (ประมาณ 200 เมตร)",
        type: "VIEWPOINT",
        imageUrl: "/images/attractions/pha-chu.jpg",
      },
      {
        name: "เสาดินนาน้อย และ คอกเสือ",
        description: "ปรากฏการณ์ธรรมชาติทางธรณีวิทยาที่เกิดจากการกัดเซาะของน้ำและลมจนเกิดเป็นริ้วรอยแท่งดินและหน้าผารูปร่างแปลกตาสวยงามคล้ายแกรนด์แคนยอน",
        type: "OTHER",
        imageUrl: "/images/attractions/sao-din-na-noi.jpg",
      },
      {
        name: "ลานกางเต็นท์ดอยเสมอดาว",
        description: "ลานกางเต็นท์ยอดนิยมบนเนินเขาสูง สัมผัสลมหนาว ชมดาวระยิบระยับยามค่ำคืน และตื่นรับไอหมอกยามเช้าเหนือทิวทัศน์ขุนเขาอันกว้างไกล",
        type: "CAMPSITE",
        imageUrl: "/images/attractions/doi-samer-dao-campsite.jpg",
      },
    ],
    warnings: [
      {
        title: "เส้นทางขึ้นดอยเสมอดาวและผาหัวสิงห์มีความสูงชัน",
        description: "เส้นทางเดินขึ้นสู่ผาหัวสิงห์เป็นหน้าผาหินแคบและลาดชัน ควรใช้ความระมัดระวังเป็นพิเศษ และห้ามออกนอกแนวเขตกั้นความปลอดภัย",
        severity: "HIGH",
        isActive: true,
      },
      {
        title: "ลมแรงและสภาพอากาศหนาวจัดในฤดูหนาว",
        description: "บริเวณสันเขาและลานกางเต็นท์ดอยเสมอดาวมีลมพัดแรงตลอดเวลา ควรยึดสมอบกเต็นท์ให้แน่นหนาและเตรียมเครื่องกันหนาวให้พร้อม",
        severity: "MEDIUM",
        isActive: true,
      },
    ],
  },
  "Doi Phu Nang National Park": {
    slug: "doi-phu-nang",
    coverImageUrl: "/images/parks/doi-phu-nang.jpg",
    attractions: [
      {
        name: "น้ำตกธารสวรรค์ (น้ำตกหินปูนเขียวมรกต)",
        description: "น้ำตกหินปูนขนาดใหญ่ความสูง 3 ชั้น สายน้ำสีเขียวมรกตใสไหลลดหลั่นผ่านหน้าผาหินปูนท่ามกลางร่มไม้ใหญ่ บรรยากาศร่มรื่นและมีน้ำไหลตลอดทั้งปี",
        type: "WATERFALL",
        imageUrl: "/images/attractions/than-sawan-waterfall.jpg",
      },
      {
        name: "แหล่งชมนกยูงไทยตามธรรมชาติ",
        description: "ถิ่นอาศัยและแหล่งผสมพันธุ์ของนกยูงไทยตามธรรมชาติที่สำคัญและสมบูรณ์ที่สุดแห่งหนึ่งของภาคเหนือ สามารถพบนกยูงออกมาหากินและรำแพนหางอวดความงดงามบริเวณที่ทำการอุทยานฯ",
        type: "OTHER",
        imageUrl: "/images/attractions/doi-phu-nang-green-peafowl.jpg",
      },
      {
        name: "ลานกางเต็นท์ดอยภูนาง",
        description: "ลานกางเต็นท์สนามหญ้าเขียวขจีบรรยากาศร่มรื่น สัมผัสธรรมชาติใกล้ชิดและชมนกยูงไทยออกมาเดินเล่นอย่างเป็นธรรมชาติ",
        type: "CAMPSITE",
        imageUrl: "/images/attractions/doi-phu-nang-campsite.jpg",
      },
    ],
    warnings: [
      {
        title: "ระวังโขดหินลื่นบริเวณน้ำตกธารสวรรค์",
        description: "บริเวณชั้นน้ำตกและโขดหินอาจมีความลื่นสูง ควรเดินด้วยความระมัดระวังและปฏิบัติตามป้ายเตือนความปลอดภัยของอุทยานฯ",
        severity: "MEDIUM",
        isActive: true,
      },
      {
        title: "ห้ามส่งเสียงดังรบกวนนกยูงและสัตว์ป่า",
        description: "เพื่อไม่ให้เป็นการรบกวนพฤติกรรมการหากินและผสมพันธุ์ของนกยูงไทยตามธรรมชาติ ควรสังเกตการณ์อย่างสงบ",
        severity: "LOW",
        isActive: true,
      },
    ],
  },
  "Thung Salaeng Luang National Park": {
    slug: "thung-salaeng-luang",
    coverImageUrl: "/images/parks/thung-salaeng-luang.jpg",
    attractions: [
      {
        name: "ทุ่งแสลงหลวง (ทุ่งหญ้าสะวันนา)",
        description: "ทุ่งหญ้าสะวันนาธรรมชาติอันกว้างใหญ่และป่าสนสองใบ ทัศนียภาพธรรมชาติที่ได้รับขนานนามว่าเป็นทุ่งหญ้าสะวันนาเมืองไทย",
        type: "VIEWPOINT",
        imageUrl: "/images/parks/thung-salaeng-luang.jpg",
      },
      {
        name: "จุดชมวิวศาลาดุสิตา",
        description: "จุดชมทัศนียภาพทุ่งหญ้าสะวันนาและทะเลหมอกยามเช้าอันเลื่องชื่อ มองเห็นทุ่งหญ้ากว้างใหญ่และแนวทิวสนในยามพระอาทิตย์ขึ้น",
        type: "VIEWPOINT",
        imageUrl: "/images/attractions/sala-dusita-viewpoint.jpg",
      },
      {
        name: "ทุ่งนางพญา",
        description: "ทุ่งนางพญาเมืองเลน ผืนป่าสนสองใบและทุ่งหญ้าธรรมชาติอันเงียบสงบ เหมาะแก่การกางเต็นท์ ปั่นจักรยานเสือภูเขา และสัมผัสธรรมชาติอย่างใกล้ชิด",
        type: "CAMPSITE",
        imageUrl: "/images/attractions/thung-nang-phaya.jpg",
      },
      {
        name: "น้ำตกแก่งโสภา",
        description: "น้ำตกหินชั้นขนาดใหญ่ฉายาไนแองการาเมืองไทย สายน้ำไหลหลั่งลดหลั่นผ่านแก่งหินกว้างขวางตระการตา",
        type: "WATERFALL",
        imageUrl: "/images/attractions/kaeng-sopha-waterfall.jpg",
      },
    ],
    warnings: [
      {
        title: "ระวังสัตว์ป่าและจำกัดความเร็วขณะขับขี่",
        description: "เส้นทางผ่านป่าธรรมชาติอาจมีสัตว์ป่าเดินข้ามถนน ควรขับขี่ด้วยความเร็วไม่เกินที่อุทยานฯ กำหนด",
        severity: "LOW",
        isActive: true,
      },
      {
        title: "ระวังกระแสน้ำเชี่ยวบริเวณน้ำตกแก่งโสภาช่วงฤดูฝน",
        description: "ช่วงฤดูฝนน้ำตกแก่งโสภาจะมีกระแสน้ำไหลเชี่ยวและมีปริมาณน้ำมาก ห้ามลงเล่นน้ำในจุดอันตรายเด็ดขาด",
        severity: "HIGH",
        isActive: true,
      },
    ],
  },
  "Namtok Chat Trakan National Park": {
    slug: "namtok-chat-trakan",
    coverImageUrl: "/images/parks/namtok-chat-trakan.jpg",
    attractions: [
      {
        name: "น้ำตกชาติตระการ (น้ำตกผาเจดีย์)",
        description: "น้ำตกขนาดใหญ่ 7 ชั้นอันเลื่องชื่อ สายน้ำไหลทอดตัวลงมาจากหน้าผาหินทรายสีแดงสูงชันอันเป็นเอกลักษณ์ ท่ามกลางผืนป่าดงดิบสมบูรณ์",
        type: "WATERFALL",
        imageUrl: "/images/parks/namtok-chat-trakan.jpg",
      },
      {
        name: "ลานกางเต็นท์น้ำตกชาติตระการ",
        description: "ลานกางเต็นท์ร่มรื่นริมลำธารธรรมชาติ สัมผัสบรรยากาศความเงียบสงบและเสียงสายน้ำไหลตลอดคืน",
        type: "CAMPSITE",
        imageUrl: "/images/attractions/chat-trakan-campground.jpg",
      },
    ],
    warnings: [
      {
        title: "ระวังโขดหินลื่นและกระแสน้ำช่วงหน้าฝน",
        description: "บริเวณโขดหินริมน้ำตกมีความลื่นสูง และช่วงฤดูฝนอาจมีน้ำป่าไหลหลาก ควรปฏิบัติตามป้ายเตือนของเจ้าหน้าที่อย่างเคร่งครัด",
        severity: "HIGH",
        isActive: true,
      },
      {
        title: "ควรสวมรองเท้าเดินป่าที่ยึดเกาะได้ดีสำหรับการเดินชมน้ำตกชั้นบน",
        description: "เส้นทางขึ้นชมน้ำตกชั้นที่สูงขึ้นไปมีความลาดชันและลื่น ควรเตรียมรองเท้าเดินป่าที่เหมาะสม",
        severity: "MEDIUM",
        isActive: true,
      },
    ],
  },
  "Phu Hin Rong Kla National Park": {
    slug: "phu-hin-rong-kla",
    coverImageUrl: "/images/parks/phu-hin-rong-kla.jpg",
    attractions: [
      {
        name: "ลานหินปุ่ม",
        description: "ลานหินธรรมชาติริมหน้าผาที่มีหินผุดขึ้นเป็นปุ่มกลมมนเรียงรายอย่างน่าอัศจรรย์ ทัศนียภาพมองเห็นหุบเขาและพระอาทิตย์อัสดงงดงาม",
        type: "VIEWPOINT",
        imageUrl: "/images/parks/phu-hin-rong-kla.jpg",
      },
      {
        name: "ผาชูธง",
        description: "จุดชมวิวหน้าผาสูงตระหง่านที่มีเสาธงชาติไทยตั้งเด่นเป็นเอกลักษณ์ มองเห็นทัศนียภาพกว้างไกลสุดสายตาและทะเลหมอกยามเช้า",
        type: "VIEWPOINT",
        imageUrl: "/images/attractions/pha-chu-thong.jpg",
      },
      {
        name: "ลานหินแตก",
        description: "ปรากฏการณ์ทางธรณีวิทยา รอยแยกแตกของแผ่นหินทรายตามธรรมชาติเป็นแนวยาว ท่ามกลางมอสและเฟิร์นเขียวขจี",
        type: "VIEWPOINT",
        imageUrl: "/images/attractions/lan-hin-taek.jpg",
      },
      {
        name: "ลานกางเต็นท์ภูหินร่องกล้า",
        description: "ลานกางเต็นท์ใต้ทิวสนและอากาศหนาวเย็นตลอดทั้งปีบนระดับความสูงกว่า 1,600 เมตรจากระดับน้ำทะเล",
        type: "CAMPSITE",
        imageUrl: "/images/attractions/phu-hin-rong-kla-campsite.jpg",
      },
    ],
    warnings: [
      {
        title: "ระวังรอยแยกลึกและหน้าผาสูงชัน",
        description: "บริเวณลานหินแตกและลานหินปุ่มมีรอยแยกหินและหน้าผาสูงชัน ควรเดินบนเส้นทางที่กำหนดและระมัดระวังเป็นพิเศษโดยเฉพาะกับเด็กเล็ก",
        severity: "HIGH",
        isActive: true,
      },
      {
        title: "สภาพอากาศหนาวเย็นและหมอกหนา",
        description: "ยอดภูมีอากาศหนาวเย็นตลอดทั้งปีและอาจมีหมอกลงจัดในช่วงเช้า-เย็น ควรเตรียมเสื้อกันหนาวและขับขี่ด้วยความระมัดระวัง",
        severity: "MEDIUM",
        isActive: true,
      },
    ],
  },
  "Tat Mok National Park": {
    slug: "tat-mok",
    coverImageUrl: "/images/parks/tat-mok.jpg",
    attractions: [
      {
        name: "น้ำตกตาดหมอก",
        description: "น้ำตกขนาดใหญ่ชั้นเดียวที่ไหลตกลงมาจากหน้าผาสูงชัน ละอองน้ำฟุ้งกระจายจนดูคล้ายสายหมอกกลางผืนป่าทึบอันอุดมสมบูรณ์",
        type: "WATERFALL",
        imageUrl: "/images/parks/tat-mok.jpg",
      },
      {
        name: "น้ำตกสองนาง",
        description: "น้ำตกหินปูนสวยงาม 12 ชั้น ไหลลดหลั่นผ่านร่มเงาผืนป่าธรรมชาติร่มรื่น",
        type: "WATERFALL",
        imageUrl: "/images/attractions/song-nang-waterfall.jpg",
      },
      {
        name: "ลานกางเต็นท์จามจุรี",
        description: "ลานกางเต็นท์สนามหญ้าเขียวขจีริมลำธารใต้ร่มเงาต้นจามจุรีใหญ่ บรรยากาศร่มรื่นและอากาศเย็นสบายตลอดทั้งปี",
        type: "CAMPSITE",
        imageUrl: "/images/attractions/chamchuri-campsite.jpg",
      },
    ],
    warnings: [
      {
        title: "ระวังหินลื่นและละอองน้ำบริเวณหน้าผาน้ำตก",
        description: "บริเวณหน้าผาน้ำตกมีละอองน้ำฟุ้งกระจายทำให้ทางเดินและโขดหินลื่น ควรเดินด้วยความระมัดระวัง",
        severity: "MEDIUM",
        isActive: true,
      },
      {
        title: "ระวังน้ำป่าไหลหลากช่วงฤดูฝน",
        description: "ช่วงฤดูฝนอาจมีกระแสน้ำป่าไหลหลากอย่างรวดเร็ว ห้ามลงเล่นน้ำเมื่อมีฝนตกหนักสะสม",
        severity: "HIGH",
        isActive: true,
      },
    ],
  },
  "Nam Nao National Park": {
    slug: "nam-nao",
    coverImageUrl: "/images/parks/nam-nao.jpg",
    attractions: [
      {
        name: "จุดชมพระอาทิตย์ตกถ้ำผาหงษ์",
        description: "จุดชมวิวพระอาทิตย์อัสดงบนยอดผาหินปูน มองเห็นทัศนียภาพขุนเขาและภูผาจิตยอดเขาโต๊ะราบอันเป็นเอกลักษณ์สุดสายตา",
        type: "VIEWPOINT",
        imageUrl: "/images/attractions/tham-pha-hong-sunset-viewpoint.jpg",
      },
      {
        name: "จุดชมพระอาทิตย์ขึ้นภูค้อ",
        description: "จุดชมวิวพระอาทิตย์ขึ้นและทะเลหมอกยามเช้าอันเลื่องชื่อ มองเห็นทิวทัศน์ผืนป่าดงดิบน้ำหนาวกว้างใหญ่สุดสายตา",
        type: "VIEWPOINT",
        imageUrl: "/images/attractions/phu-kho-sunrise-viewpoint.jpg",
      },
      {
        name: "ลานกางเต็นท์น้ำหนาว (สวนสนบ้านแปก)",
        description: "ลานกางเต็นท์ใต้ร่มเงาป่าสนธรรมชาติ อากาศหนาวเย็นตลอดทั้งปีและสัมผัสความอุดมสมบูรณ์ของธรรมชาติ",
        type: "CAMPSITE",
        imageUrl: "/images/attractions/nam-nao-campground.jpg",
      },
    ],
    warnings: [
      {
        title: "ระวังสัตว์ป่าข้ามถนนและจำกัดความเร็ว",
        description: "ทางหลวงสาย 12 ตัดผ่านใจกลางอุทยานฯ มีช้างป่าและสัตว์ป่าข้ามถนนบ่อยครั้ง ควรขับขี่ด้วยความระมัดระวังและใช้ความเร็วไม่เกิน 60 กม./ชม.",
        severity: "HIGH",
        isActive: true,
      },
      {
        title: "สภาพอากาศหนาวเย็นจัดในเวลากลางคืน",
        description: "ช่วงฤดูหนาวอุณหภูมิอาจลดต่ำลงเหลือเลขตัวเดียว ควรเตรียมเครื่องกันหนาวและอุปกรณ์แคมป์ปิ้งให้พร้อม",
        severity: "MEDIUM",
        isActive: true,
      },
    ],
  },
  "Doi Pha Klong National Park": {
    slug: "doi-pha-klong",
    coverImageUrl: "/images/parks/doi-pha-klong.jpg",
    attractions: [
      {
        name: "ภูเขาหินปะการัง",
        description: "ปรากฏการณ์ธรรมชาติสุดมหัศจรรย์ แท่งหินปูนยอดแหลมคมคล้ายปะการังใต้ทะเล มีสะพานแขวนและเส้นทางเดินศึกษาธรรมชาติชมวิวผาหินแปลกตา",
        type: "VIEWPOINT",
        imageUrl: "/images/attractions/phukhao-hin-pakarang.jpg",
      },
      {
        name: "สวนหินมหาราช",
        description: "สวนหย่อมธรรมชาติร่มรื่น จัดแสดงโขดหินปูนรูปทรงแปลกตาท่ามกลางแมกไม้เขียวขจีและสนามหญ้า เหมาะแก่การพักผ่อนและถ่ายภาพ",
        type: "OTHER",
        imageUrl: "/images/attractions/suan-hin-maharat.jpg",
      },
      {
        name: "ถ้ำเอราวัณ",
        description: "ถ้ำหินงอกหินย้อยขนาดใหญ่ ภายในโอ่โถงวิจิตรตระการตา มีเสาหินและประติมากรรมหินงอกหินย้อยธรรมชาติรูปร่างคล้ายช้างเอราวัณ",
        type: "OTHER",
        imageUrl: "/images/attractions/tham-erawan.jpg",
      },
    ],
    warnings: [
      {
        title: "ระวังโขดหินปูนแหลมคมและทางเดินลาดชัน",
        description: "บริเวณเส้นทางภูเขาหินปะการังมีหินปูนขอบแหลมคมและสะพานแขวน ควรสวมรองเท้าหุ้มส้นที่ยึดเกาะได้ดีและใช้ความระมัดระวัง",
        severity: "MEDIUM",
        isActive: true,
      },
      {
        title: "เตรียมน้ำดื่มและเครื่องป้องกันแสงแดด",
        description: "บริเวณสวนหินและเส้นทางเดินชมหินปะการังเป็นลานโล่งแจ้ง แสงแดดค่อนข้างแรงในช่วงเวลากลางวัน",
        severity: "LOW",
        isActive: true,
      },
    ],
  },
  "Doi Khun Tan National Park": {
    slug: "doi-khun-tan",
    coverImageUrl: "/images/parks/doi-khun-tan.jpg",
    attractions: [
      {
        name: "จุดชมวิวยอดดอยขุนตาล (ย.4 มอนส่องกล้อง)",
        description: "จุดชมวิวสูงสุดบนยอดดอยขุนตาลที่ระดับความสูง 1,373 เมตรจากระดับน้ำทะเล มองเห็นทิวทัศน์เทือกเขาเขียวขจีสลับซับซ้อน ทะเลหมอก และทิวทัศน์ตัวเมืองลำปาง-ลำพูน",
        type: "VIEWPOINT",
        imageUrl: "/images/attractions/doi-khun-tan-peak.jpg",
      },
      {
        name: "เส้นทางเดินป่าศึกษาธรรมชาติประวัติศาสตร์ ย.1 - ย.4",
        description: "เส้นทางเดินเท้าสัมผัสธรรมชาติและเรื่องราวประวัติศาสตร์ ผ่านจุดพัก 4 จุด (ย.1 บ้านพักรถไฟ, ย.2 สวนสน/บ้านพักมิชชันนารี, ย.3 ค่ายพัก, ย.4 มอนส่องกล้อง)",
        type: "TRAIL",
        imageUrl: "/images/attractions/doi-khun-tan-trail.jpg",
      },
      {
        name: "น้ำตกตาดเหมย",
        description: "น้ำตกธรรมชาติร่มรื่นกลางป่าเขา สายน้ำไหลผ่านหน้าผาหินลดหลั่นลงสู่แอ่งน้ำเย็นฉ่ำ เหมาะแก่การพักผ่อนคลายเหนื่อยระหว่างเดินป่าศึกษาธรรมชาติ",
        type: "WATERFALL",
        imageUrl: "/images/attractions/tat-moei-waterfall.jpg",
      },
      {
        name: "สถานีรถไฟขุนตานและอุโมงค์ขุนตาน",
        description: "สถานีรถไฟประวัติศาสตร์ที่ตั้งอยู่สูงที่สุดในประเทศไทย และอุโมงค์รถไฟที่ยาวที่สุดในไทย (1,352 เมตร) ก่อสร้างด้วยอิฐสีแดงอันเป็นเอกลักษณ์ จุดเริ่มต้นยอดนิยมสำหรับนักท่องเที่ยวสายรถไฟ",
        type: "OTHER",
        imageUrl: "/images/attractions/khun-tan-tunnel.jpg",
      },
    ],
    warnings: [
      {
        title: "คำแนะนำการเดินทางโดยรถไฟสายเหนือ (สถานีขุนตาน)",
        description: "สามารถโดยสารรถไฟสายเหนือลงที่ 'สถานีรถไฟขุนตาน' (ผ่านอุโมงค์ขุนตาน) จากนั้นเดินเท้าตามเส้นทางศึกษาธรรมชาติขึ้นสู่ที่ทำการอุทยานฯ ระยะทางประมาณ 1.3 กม. (ใช้เวลาเดินเท้าประมาณ 30-45 นาที) ควรตรวจสอบตารางเวลาขบวนรถไฟและเตรียมน้ำดื่มให้พร้อม",
        severity: "LOW",
        isActive: true,
      },
      {
        title: "เตรียมความพร้อมร่างกายสำหรับเส้นทางเดินเท้าขึ้นยอดเขา",
        description: "เส้นทางเดินขึ้น ย.4 มีระยะทางกว่า 5 กิโลเมตรและทางลาดชัน ควรเตรียมรองเท้าเดินป่าที่เหมาะสมและน้ำดื่มให้เพียงพอ",
        severity: "MEDIUM",
        isActive: true,
      },
      {
        title: "ระวังสภาพอากาศหนาวเย็นและหมอกหนาบนยอดดอย",
        description: "บริเวณยอดดอยขุนตาลมีลมแรงและอากาศหนาวเย็น ควรเตรียมเสื้อกันหนาวและอุปกรณ์ป้องกันลม",
        severity: "LOW",
        isActive: true,
      },
    ],
  },
  "Doi Jong National Park": {
    slug: "doi-jong",
    coverImageUrl: "/images/parks/doi-jong.jpg",
    attractions: [
      {
        name: "ซุ้มป้ายอุทยานแห่งชาติดอยจงและจุดชมทัศนียภาพ",
        description: "จุดเช็คอินซุ้มป้ายอุทยานแห่งชาติดอยจง รายล้อมด้วยแมกไม้ ป่าเต็งรัง อ่างเก็บน้ำ และวิวทิวเขาเขียวขจีอันเป็นเอกลักษณ์",
        type: "VIEWPOINT",
        imageUrl: "/images/attractions/doi-jong-entrance.jpg",
      },
      {
        name: "จุดชมวิวยอดดอยจง",
        description: "จุดชมวิวสูงสุดบนยอดดอยจงที่ระดับความสูง 1,379 เมตรจากระดับน้ำทะเล ชมวิวทิวเขาสลับซับซ้อน ทะเลหมอก และแสงอาทิตย์อัสดงยามเย็นอันงดงามตระการตา",
        type: "VIEWPOINT",
        imageUrl: "/images/attractions/doi-jong-peak.jpg",
      },
    ],
    warnings: [
      {
        title: "เตรียมสภาพร่างกายและอุปกรณ์สำหรับการเดินป่าขึ้นยอดเขา",
        description: "เส้นทางขึ้นยอดดอยจงเป็นทางลาดชันและใช้เวลาเดินเท้าหลายชั่วโมง ควรประสานงานเจ้าหน้าที่นำทางและเตรียมน้ำดื่มให้เพียงพอ",
        severity: "MEDIUM",
        isActive: true,
      },
      {
        title: "ระมัดระวังไฟป่าและสภาพอากาศแห้งแล้งช่วงฤดูแล้ง",
        description: "ช่วงฤดูแล้งสภาพป่ามีความแห้งสูง ห้ามก่อกองไฟนอกบริเวณที่กำหนดและปฏิบัติตามคำแนะนำของเจ้าหน้าที่อย่างเคร่งครัด",
        severity: "LOW",
        isActive: true,
      },
    ],
  },
  "Tham Pha Thai National Park": {
    slug: "tham-pha-thai",
    coverImageUrl: "/images/parks/tham-pha-thai.jpg",
    attractions: [
      {
        name: "หล่มภูเขียว",
        description: "แอ่งน้ำธรรมชาติสีเขียวมรกตขนาดใหญ่กลางหุบเขาหินปูน น้ำใสสะอาดมองเห็นฝูงปลาแหวกว่าย เกิดจากการยุบตัวของชั้นหินปูน (Sinkhole) แหล่งธรรมชาติสุดมหัศจรรย์และเงียบสงบ",
        type: "OTHER",
        imageUrl: "/images/attractions/lom-phu-khieo.jpg",
      },
      {
        name: "ถ้ำผาไท",
        description: "ถ้ำหินปูนขนาดใหญ่ลึกกว่า 1 กิโลเมตร ภายในมีโถงถ้ำโอ่โถง เสาหินงอกหินย้อยตระการตา ปล่องแสงธรรมชาติสาดส่อง และจารึกพระปรมาภิไธยย่อ ป.ป.ร. ของรัชกาลที่ 7",
        type: "OTHER",
        imageUrl: "/images/attractions/tham-pha-thai-cave.jpg",
      },
      {
        name: "น้ำตกแม่แก้",
        description: "น้ำตกหินปูนธรรมชาติขนาดใหญ่ สูงหลายชั้น สายน้ำไหลผ่านชั้นหินปูนลดหลั่นสวยงามลงสู่แอ่งน้ำใสท่ามกลางร่มเงาแมกไม้เขียวขจี เหมาะแก่การพักผ่อนหย่อนใจและสัมผัสความสดชื่น",
        type: "WATERFALL",
        imageUrl: "/images/attractions/mae-kae-waterfall.jpg",
      },
      {
        name: "น้ำตกเกาฟุ",
        description: "น้ำตกหินปูนที่สร้างสรรค์และดูแลโดยผู้นำชุมชนชาวม้ง มีแอ่งน้ำใสสะอาดและสายน้ำไหลลดหลั่นเป็นชั้นหินปูนสีทองท่ามกลางแมกไม้อันร่มรื่น บรรยากาศเงียบสงบ",
        type: "WATERFALL",
        imageUrl: "/images/attractions/gao-fu-waterfall.jpg",
      },
    ],
    warnings: [
      {
        title: "ห้ามลงเล่นน้ำในหล่มภูเขียวโดยเด็ดขาด",
        description: "เนื่องจากหล่มภูเขียวเป็นแอ่งน้ำลึกมากและเป็นพื้นที่อนุรักษ์ธรรมชาติ ควรชมความงดงามบนจุดชมวิวและระเบียงที่จัดไว้เท่านั้น",
        severity: "HIGH",
        isActive: true,
      },
      {
        title: "ระวังพื้นทางเดินลื่นและเตรียมไฟฉายสำหรับสำรวจถ้ำ",
        description: "บริเวณภายในถ้ำผาไทยังคงสภาพธรรมชาติ บางจุดมีความชื้นและมืด ควรใช้ความระมัดระวังขณะเดินชม",
        severity: "MEDIUM",
        isActive: true,
      },
    ],
  },
  "Chae Son National Park": {
    slug: "chae-son",
    coverImageUrl: "/images/parks/chae-son.jpg",
    attractions: [
      {
        name: "บ่อน้ำร้อนแจ้ซ้อน",
        description: "แหล่งน้ำพุร้อนธรรมชาติ 9 บ่อ อุณหภูมิเฉลี่ย 73 องศาเซลเซียส ไอน้ำลอยกรุ่นเหนือบ่อน้ำแร่ยามเช้าอันงดงาม มีกิจกรรมต้มไข่น้ำแร่และอาบน้ำแร่เพื่อสุขภาพ",
        type: "OTHER",
        imageUrl: "/images/attractions/chae-son-hotsprings.jpg",
      },
      {
        name: "น้ำตกแจ้ซ้อน",
        description: "น้ำตกธรรมชาติ 6 ชั้น สายน้ำไหลผ่านหน้าผาหินลงสู่แอ่งน้ำใสท่ามกลางผืนป่าเขาเขียวขจีอันอุดมสมบูรณ์ เหมาะแก่การพักผ่อนหย่อนใจและลงเล่นน้ำ",
        type: "WATERFALL",
        imageUrl: "/images/attractions/chae-son-waterfall.jpg",
      },
      {
        name: "ลานกางเต็นท์แจ้ซ้อน",
        description: "ลานกางเต็นท์ใต้ร่มเงาป่าธรรมชาติและริมลำธาร อากาศเย็นสบายตลอดทั้งปี มีสิ่งอำนวยความสะดวกครบครัน เหมาะสำหรับการพักแรมสัมผัสธรรมชาติ",
        type: "CAMPSITE",
        imageUrl: "/images/attractions/chae-son-campsite.jpg",
      },
    ],
    warnings: [
      {
        title: "ระวังความร้อนสูงบริเวณบ่อน้ำพุร้อน",
        description: "อุณหภูมิของบ่อน้ำพุร้อนสูงถึง 70-80°C ห้ามลงไปสัมผัสหรือลงเล่นในบ่อน้ำร้อนโดยตรง และควรระมัดระวังขณะต้มไข่",
        severity: "HIGH",
        isActive: true,
      },
      {
        title: "ปฏิบัติตามคำแนะนำในการแช่น้ำแร่เพื่อสุขภาพ",
        description: "ผู้มีโรคประจำตัว เช่น ความดันโลหิตสูงหรือโรคหัวใจ ควรแช่น้ำแร่ไม่เกินครั้งละ 10-15 นาที และปฏิบัติตามป้ายเตือนอย่างเคร่งครัด",
        severity: "MEDIUM",
        isActive: true,
      },
    ],
  },
  "Ton Sak Yai National Park": {
    slug: "ton-sak-yai",
    coverImageUrl: "/images/parks/ton-sak-yai.jpg",
    attractions: [
      {
        name: "ต้นสักใหญ่ที่สุดในโลก",
        description: "ต้นสักทองธรรมชาติขนาดใหญ่ที่สุดในโลก อายุกว่า 1,500 ปี มีขนาดลำต้นโตถึง 10 คนโอบ สูงตระหง่านกลางผืนป่าสักอันอุดมสมบูรณ์ พร้อมสะพานไม้ยกพื้นล้อมรอบให้เดินชมและถ่ายภาพอย่างใกล้ชิด",
        type: "OTHER",
        imageUrl: "/images/attractions/ton-sak-yai-giant-teak.jpg",
      },
      {
        name: "ยอดภูเมี่ยง (ความสูง 1,656 ม.)",
        description: "เส้นทางศึกษาธรรมชาติและพิชิตยอดเขาความสูง 1,656 เมตรจากระดับน้ำทะเล ในท้องที่บ้านต้นขนุน ตำบลน้ำไผ่ อำเภอน้ำปาด สัมผัสลมหนาว ชมทัศนียภาพขุนเขาสลับซับซ้อนแบบพาโนรามา มอบประสบการณ์เดินป่าสุดท้าทาย",
        type: "VIEWPOINT",
        imageUrl: "/images/attractions/phu-miang-peak.jpg",
      },
    ],
    warnings: [
      {
        title: "เส้นทางพิชิตยอดภูเมี่ยงมีความสูงชันและท้าทาย",
        description: "เส้นทางเดินป่าขึ้นสู่ยอดภูเมี่ยง (1,656 ม.) เป็นเส้นทางภูเขาสูงชัน ควรเตรียมความพร้อมของร่างกาย สวมรองเท้าเดินป่า และติดต่อเจ้าหน้าที่หน่วยพิทักษ์อุทยานฯ สญ.1 (ต้นขนุน) ก่อนออกเดินทาง",
        severity: "HIGH",
        isActive: true,
      },
      {
        title: "ห้ามปีนป่ายหรือสัมผัสต้นสักใหญ่",
        description: "เพื่อการอนุรักษ์ต้นสักทองโบราณ กรุณาเดินชมและถ่ายภาพบนสะพานไม้ยกพื้นที่กำหนดไว้เท่านั้น และห้ามข้ามแนวรั้วกั้น",
        severity: "MEDIUM",
        isActive: true,
      },
      {
        title: "ระวังสะพานไม้ลื่นช่วงฤดูฝน",
        description: "สะพานไม้อาจมีความลื่นเมื่อมีความชื้นหรือมีฝนตก ควรเดินด้วยความระมัดระวัง",
        severity: "LOW",
        isActive: true,
      },
    ],
  },
  "Phu Soi Dao National Park": {
    slug: "phu-soi-dao",
    coverImageUrl: "/images/parks/phu-soi-dao.jpg",
    attractions: [
      {
        name: "ลานสนสามใบภูสอยดาว (และทุ่งดอกหงอนนาค)",
        description: "ที่ราบป่าสนสามใบธรรมชาติอันกว้างใหญ่บนยอดภูสอยดาว ความสูง 1,633 เมตรจากระดับน้ำทะเล สัมผัสอากาศเย็นสบายตลอดปี โอบล้อมด้วยแนวทิวเขาสูงตระหง่าน และทุ่งดอกหงอนนาคสีม่วงผลิบานสะพรั่งในช่วงฤดูฝน",
        type: "CAMPSITE",
        imageUrl: "/images/attractions/lan-son-phu-soi-dao.jpg",
      },
      {
        name: "จุดชมวิวทะเลหมอกและพระอาทิตย์ตก",
        description: "จุดชมวิวทัศนียภาพทะเลหมอกหนาทึบและพระอาทิตย์อัสดงยามเย็นเหนือทิวเขาสลับซับซ้อนตามแนวชายแดนไทย-ลาว บรรยากาศสุดอลังการ",
        type: "VIEWPOINT",
        imageUrl: "/images/attractions/phu-soi-dao-sea-of-mist.jpg",
      },
      {
        name: "น้ำตกภูสอยดาว",
        description: "น้ำตกธรรมชาติสวยงาม 5 ชั้น ไหลผ่านโขดหินใหญ่และแอ่งน้ำใสท่ามกลางผืนป่าร่มรื่น ตั้งอยู่ใกล้ศูนย์บริการนักท่องเที่ยว และเป็นจุดเริ่มต้นของเส้นทางเดินป่าขึ้นสู่ยอดลานสน",
        type: "WATERFALL",
        imageUrl: "/images/attractions/phu-soi-dao-waterfall.jpg",
      },
    ],
    warnings: [
      {
        title: "เส้นทางเดินขึ้นลานสนลาดชันสูง (ผ่าน 5 เนินปราบเซียน)",
        description: "เส้นทางเดินเท้าขึ้นสู่ลานสนระยะทาง 6.5 กิโลเมตร มีความชันต่อเนื่อง (เนินส่งญาติ, เนินปราบเซียน, เนินป่าก่อ, เนินเสือโคร่ง, เนินมรณะ) ใช้เวลาเดิน 4-6 ชั่วโมง ควรเตรียมสภาพร่างกายและรองเท้าเดินป่าให้พร้อม",
        severity: "HIGH",
        isActive: true,
      },
      {
        title: "สภาพอากาศหนาวจัด ลมแรง และฝนชุก",
        description: "บริเวณลานสนมีอากาศหนาวเย็นตลอดปีและมีฝนตกชุก ควรเตรียมเสื้อกันฝน ถุงกันทาก และอุปกรณ์กันน้ำให้พร้อม",
        severity: "MEDIUM",
        isActive: true,
      },
      {
        title: "ควรลงทะเบียนจองสิทธิ์ล่วงหน้าและจำกัดจำนวนนักท่องเที่ยว",
        description: "อุทยานฯ มีการจำกัดจำนวนผู้พักแรมบนลานสนต่อวันเพื่อรักษาสภาพแวดล้อม ควรตรวจสอบและจองคิวล่วงหน้าก่อนเดินทาง",
        severity: "LOW",
        isActive: true,
      },
    ],
  },
  "Lam Nam Nan National Park": {
    slug: "lam-nam-nan",
    coverImageUrl: "/images/parks/lam-nam-nan.jpg",
    attractions: [
      {
        name: "ลานกางเต็นท์ริมอ่างเก็บน้ำเขื่อนสิริกิติ์",
        description: "ลานสนามหญ้ากางเต็นท์ริมเวิ้งน้ำอ่างเก็บน้ำเขื่อนสิริกิติ์ บรรยากาศเงียบสงบ ลมพัดเย็นสบาย ชมวิวทะเลสาบ เกาะแก่ง และทิวเขาสลับซับซ้อน เหมาะแก่การแคมป์ปิ้งพักผ่อน",
        type: "CAMPSITE",
        imageUrl: "/images/attractions/lam-nam-nan-campsite.jpg",
      },
      {
        name: "ล่องเรือชมทัศนียภาพอ่างเก็บน้ำเขื่อนสิริกิติ์",
        description: "กิจกรรมล่องเรือชมความงดงามของผืนน้ำกว้างใหญ่ เกาะแก่งน้อยใหญ่ และวิถีชีวิตชาวประมงพื้นบ้านริมทะเลสาบเหนือเขื่อนสิริกิติ์ สัมผัสสายลมและทิวทัศน์ธรรมชาติ",
        type: "VIEWPOINT",
        imageUrl: "/images/attractions/lam-nam-nan-boat-tour.jpg",
      },
    ],
    warnings: [
      {
        title: "สวมเสื้อชูชีพทุกครั้งเมื่อทำกิจกรรมทางน้ำหรือล่องเรือ",
        description: "เพื่อความปลอดภัยในการล่องเรือและท่องเที่ยวบริเวณอ่างเก็บน้ำเขื่อนสิริกิติ์ ควรสวมเสื้อชูชีพตลอดเวลาและปฏิบัติตามคำแนะนำของเจ้าหน้าที่",
        severity: "MEDIUM",
        isActive: true,
      },
      {
        title: "ระวังพื้นที่ริมตลิ่งน้ำลึกและห้ามลงเล่นน้ำในจุดห้าม",
        description: "บริเวณริมอ่างเก็บน้ำบางจุดมีความลาดชันและระดับน้ำลึก ห้ามลงเล่นน้ำนอกบริเวณที่อุทยานฯ กำหนด",
        severity: "MEDIUM",
        isActive: true,
      },
    ],
  },
  "Wiang Kosai National Park": {
    slug: "wiang-kosai",
    coverImageUrl: "/images/parks/wiang-kosai.jpg",
    attractions: [
      {
        name: "น้ำตกแม่เกิ๋งหลวง",
        description: "น้ำตกหินธรรมชาติขนาดใหญ่ 7 ชั้นอันเลื่องชื่อ สายน้ำไหลตกผ่านหน้าผาหินลดหลั่นลงสู่แอ่งน้ำใสท่ามกลางผืนป่าดงดิบอันร่มรื่นและอุดมสมบูรณ์ เป็นไฮไลท์หลักของอุทยานแห่งชาติเวียงโกศัย",
        type: "WATERFALL",
        imageUrl: "/images/attractions/mae-koeng-luang-waterfall.jpg",
      },
      {
        name: "เส้นทางศึกษาธรรมชาติน้ำตกแม่เกิ๋งน้อย",
        description: "เส้นทางเดินป่าศึกษาธรรมชาติและห้องเรียนคนเดินป่าเลียบลำห้วย ชมความอุดมสมบูรณ์ของพรรณไม้ป่าดงดิบชื้น เฟิร์น ลำธารน้ำตกใสสะอาด และชั้นน้ำตกแม่เกิ๋งน้อยอันร่มรื่น",
        type: "TRAIL",
        imageUrl: "/images/attractions/mae-koeng-noi-trail.jpg",
      },
    ],
    warnings: [
      {
        title: "ระวังโขดหินลื่นและกระแสน้ำช่วงฤดูฝน",
        description: "บริเวณโขดหินและหน้าผาน้ำตกมีความลื่นสูง ห้ามปีนป่ายนอกเส้นทางและระมัดระวังกระแสน้ำหลากหลังฝนตกหนัก",
        severity: "MEDIUM",
        isActive: true,
      },
      {
        title: "เตรียมรองเท้าเดินป่าที่ยึดเกาะดีบนเส้นทางศึกษาธรรมชาติ",
        description: "เส้นทางเดินป่าเลียบลำธารมีความชื้นสูงและมีก้อนหินลื่น ควรปฏิบัติตามป้ายสื่อความหมายและสวมรองเท้าที่เหมาะสม",
        severity: "LOW",
        isActive: true,
      },
    ],
  },
  "Namtok Mae Surin National Park": {
    slug: "namtok-mae-surin",
    coverImageUrl: "/images/parks/namtok-mae-surin.jpg",
    attractions: [
      {
        name: "จุดชมวิวน้ำตกแม่สุรินทร์",
        description: "น้ำตกชั้นเดียวขนาดใหญ่ที่สูงที่สุดแห่งหนึ่งของไทย สูงกว่า 100 เมตร สายน้ำสีขาวไหลทิ้งตัวจากหน้าผาสูงชันลงสู่หุบเหวลึกเบื้องล่าง ท่ามกลางผืนป่าดิบเขาอันอุดมสมบูรณ์และม่านหมอกธรรมชาติ",
        type: "WATERFALL",
        imageUrl: "/images/attractions/namtok-mae-surin.jpg",
      },
      {
        name: "ทุ่งดอกบัวตองดอยแม่อูคอ",
        description: "ทุ่งดอกบัวตองสีเหลืองทองอร่ามบานสะพรั่งปกคลุมทิวเขาสลับซับซ้อนกว้างใหญ่กว่า 500 ไร่ พร้อมถนนคดเคี้ยวชมวิวมุมสูงแบบพาโนรามา ในช่วงฤดูหนาว (พฤศจิกายน - ธันวาคม) อันเลื่องชื่อระดับประเทศ",
        type: "VIEWPOINT",
        imageUrl: "/images/attractions/bua-tong-doi-mae-u-kho.jpg",
      },
      {
        name: "เส้นทางเดินศึกษาธรรมชาติหุบเขาน้ำตกแม่สุรินทร์",
        description: "เส้นทางเดินเท้าศึกษาธรรมชาติบนสันเขาเลาะแนวรั้วไม้ ชมทัศนียภาพหุบเขาเขียวขจี ป่าดิบเขา และมองเห็นสายน้ำตกแม่สุรินทร์ทิ้งตัวลงกลางหุบเขาอย่างงดงามตระการตา",
        type: "TRAIL",
        imageUrl: "/images/attractions/mae-surin-valley-trail.jpg",
      },
    ],
    warnings: [
      {
        title: "หน้าผาสูงชันและลมกรรโชกแรงบริเวณจุดชมวิว",
        description: "บริเวณจุดชมวิวน้ำตกเป็นหน้าผาสูงชันและมีลมพัดแรง ห้ามปีนป่ายข้ามแนวระเบียงรั้วกั้นเพื่อความปลอดภัย",
        severity: "HIGH",
        isActive: true,
      },
      {
        title: "เส้นทางขึ้นเขาคดเคี้ยวและลาดชันสูง",
        description: "ถนนทางเข้าอุทยานฯ และดอยแม่อูคอเป็นทางขึ้นเขาสูงชันและโค้งคดเคี้ยวมาก ควรตรวจเช็กระบบเบรกและใช้เกียร์ต่ำขณะขับขี่",
        severity: "MEDIUM",
        isActive: true,
      },
    ],
  },
  "Salawin National Park": {
    slug: "salawin",
    coverImageUrl: "/images/parks/salawin.jpg",
    attractions: [
      {
        name: "ล่องเรือชมทัศนียภาพแม่น้ำสาละวิน",
        description: "กิจกรรมล่องเรือสัมผัสความยิ่งใหญ่ของแม่น้ำสาละวิน สายน้ำนานาชาติที่กั้นพรมแดนไทย-เมียนมา ชมหน้าผาหินสูงตระหง่าน โขดหินธรรมชาติ และผืนป่าดงดิบสมบูรณ์ริมสองฝั่งน้ำ",
        type: "VIEWPOINT",
        imageUrl: "/images/attractions/salawin-river-cruise.jpg",
      },
      {
        name: "จุดชมวิวตะวันตกสุดแดนสยาม (หาดทรายแม่น้ำสาละวิน)",
        description: "จุดชมวิวและป้ายสัญลักษณ์ 'ตะวันตกสุดแดนสยาม แม่น้ำสาละวิน' ริมหาดทรายขาวละเอียด สัมผัสบรรยากาศชายแดนไทย-เมียนมา ชมพระอาทิตย์ตกดินลับเหลี่ยมเขาและสายน้ำสาละวินอันงดงาม",
        type: "VIEWPOINT",
        imageUrl: "/images/attractions/salawin-westernmost-siam.jpg",
      },
      {
        name: "ลานกางเต็นท์ริมแม่น้ำสาละวิน",
        description: "ลานกางเต็นท์สนามหญ้ากว้างขวางท่ามกลางขุนเขาและแมกไม้ สัมผัสอากาศเย็นสบายริมแม่น้ำสาละวิน บรรยากาศเงียบสงบ เหมาะสำหรับพักแรมและชมดาวยามค่ำคืน",
        type: "CAMPSITE",
        imageUrl: "/images/attractions/salawin-campsite.jpg",
      },
    ],
    warnings: [
      {
        title: "สวมเสื้อชูชีพตลอดเวลาขณะล่องเรือแม่น้ำสาละวิน",
        description: "แม่น้ำสาละวินมีกระแสน้ำไหลเชี่ยวและมีเกาะแก่งหินใต้น้ำ ควรสวมเสื้อชูชีพและปฏิบัติตามคำแนะนำของคนขับเรือและเจ้าหน้าที่อย่างเคร่งครัด",
        severity: "HIGH",
        isActive: true,
      },
      {
        title: "ปฏิบัติตามระเบียบพื้นที่ชายแดนความมั่นคง",
        description: "พื้นที่ริมแม่น้ำเป็นเขตรอยต่อชายแดนไทย-เมียนมา ควรพกบัตรประจำตัวประชาชนและไม่ข้ามไปยังฝั่งประเทศเพื่อนบ้านนอกจุดผ่อนปรนที่ได้รับอนุญาต",
        severity: "MEDIUM",
        isActive: true,
      },
    ],
  },
};

const keywordAttractionTypes = [
  { keywords: ["waterfall", "namtok", "water fall"], type: "WATERFALL" as const },
  { keywords: ["trail", "trek", "hiking", "forest"], type: "TRAIL" as const },
  { keywords: ["camp", "campsite"], type: "CAMPSITE" as const },
  { keywords: ["view", "doi", "peak", "cliff", "mist", "sea"], type: "VIEWPOINT" as const },
];

const correctedCoordinateMap = new Map(
  (correctedCoordinates as RawPark[]).map((park) => [
    park.nameEn,
    {
      latitude: park.latitude,
      longitude: park.longitude,
    },
  ]),
);

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/national park/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function resolveSlug(rawPark: RawPark, usedSlugs: Set<string>) {
  const overrideSlug = curatedOverrides[rawPark.nameEn]?.slug;
  let candidate = overrideSlug ?? slugify(rawPark.nameEn || rawPark.name);

  if (!candidate) {
    candidate = `park-${usedSlugs.size + 1}`;
  }

  if (!usedSlugs.has(candidate)) {
    usedSlugs.add(candidate);
    return candidate;
  }

  const provinceSlug = slugify(rawPark.province);
  const withProvince = provinceSlug ? `${candidate}-${provinceSlug}` : `${candidate}-${usedSlugs.size + 1}`;

  if (!usedSlugs.has(withProvince)) {
    usedSlugs.add(withProvince);
    return withProvince;
  }

  let suffix = 2;
  while (usedSlugs.has(`${withProvince}-${suffix}`)) {
    suffix += 1;
  }

  const uniqueSlug = `${withProvince}-${suffix}`;
  usedSlugs.add(uniqueSlug);
  return uniqueSlug;
}

function splitOpeningHours(openingHours: string) {
  const [openTime = "08:00", closeTime = "16:30"] = openingHours.split("-").map((item) => item.trim());
  return { openTime, closeTime };
}

function inferAttractionType(name: string) {
  const normalized = name.toLowerCase();

  for (const matcher of keywordAttractionTypes) {
    if (matcher.keywords.some((keyword) => normalized.includes(keyword))) {
      return matcher.type;
    }
  }

  return "OTHER" as const;
}

function buildAttractions(rawPark: RawPark) {
  const overrideAttractions = curatedOverrides[rawPark.nameEn]?.attractions;

  if (overrideAttractions) {
    return overrideAttractions;
  }

  const tags = rawPark.tags?.filter(Boolean) ?? [];
  const tagAttractions = tags.slice(0, 3).map((tag) => ({
    name: tag,
    description: `Recommended activity highlight for ${rawPark.nameEn}.`,
    type: inferAttractionType(tag),
    imageUrl: undefined,
  }));

  if (tagAttractions.length > 0) {
    return tagAttractions;
  }

  return [
    {
      name: rawPark.nameEn,
      description: `Signature nature stop in ${rawPark.province}.`,
      type: inferAttractionType(rawPark.nameEn),
      imageUrl: undefined,
    },
  ];
}

function buildWarnings(rawPark: RawPark) {
  const overrideWarnings = curatedOverrides[rawPark.nameEn]?.warnings;

  if (overrideWarnings) {
    return overrideWarnings;
  }

  return [];
}

const usedSlugs = new Set<string>();

export const parks = (parksData as RawPark[]).map((rawPark) => {
  const { openTime, closeTime } = splitOpeningHours(rawPark.openingHours);
  const override = curatedOverrides[rawPark.nameEn];
  const correctedCoordinate = correctedCoordinateMap.get(rawPark.nameEn);

  return {
    slug: resolveSlug(rawPark, usedSlugs),
    nameTh: rawPark.name,
    nameEn: rawPark.nameEn,
    province: rawPark.province,
    region: "NORTH" as const,
    latitude: correctedCoordinate?.latitude ?? rawPark.latitude,
    longitude: correctedCoordinate?.longitude ?? rawPark.longitude,
    openTime,
    closeTime,
    description: rawPark.description,
    coverImageUrl: override?.coverImageUrl ?? null,
    isActive: true,
    attractions: buildAttractions(rawPark),
    warnings: buildWarnings(rawPark),
  };
});
