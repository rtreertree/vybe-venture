// Fictional products for the mock bank. Names, issuers and symbols are invented.
export type SeedProduct = {
  symbol: string;
  name: string;
  type: "stock" | "fund" | "bond" | "crypto";
  area: string;
  risk: "low" | "medium" | "high";
  price: number;
  issuer: string;
  region: string;
  dividendYieldPercent: number;
  size: number;
  inceptionDate: string;
  description: string;
  riskNote: string;
  holdings?: { name: string; weightPercent: number }[];
};

export const SEED_PRODUCTS: SeedProduct[] = [
  {
    symbol: "NWIX", name: "Northwind Total Market Fund", type: "fund", area: "Broad market", risk: "medium", price: 260,
    issuer: "Northwind Asset Management", region: "Global", dividendYieldPercent: 1.4, size: 1_200_000_000, inceptionDate: "2011-05-24",
    description: "Holds thousands of companies of every size in a single fund. It follows the overall market instead of trying to beat it, so results track how the wider stock market performs.",
    riskNote: "Falls with the market. Drops of 30% or more have happened in past downturns.",
    holdings: [
      { name: "Brightwave Devices Co", weightPercent: 6.1 }, { name: "Cobalt Software Co", weightPercent: 5.8 },
      { name: "Meridian Banking Group", weightPercent: 4.2 }, { name: "Harbor Retail Group", weightPercent: 3.6 },
      { name: "Summit Energy Corp", weightPercent: 3.1 },
    ],
  },
  {
    symbol: "ATLG", name: "Atlasgate World Index Fund", type: "fund", area: "Broad market", risk: "medium", price: 118.4,
    issuer: "Atlasgate Funds", region: "Developed markets", dividendYieldPercent: 1.9, size: 3_400_000_000, inceptionDate: "2014-09-12",
    description: "Spreads money across large companies in wealthy countries outside any single home market. It aims to match a world index at a low cost rather than pick winners.",
    riskNote: "Moves with global stock markets and with currency changes. A weak year for world markets means a weak year for this fund.",
    holdings: [
      { name: "Fjord Logistics AS", weightPercent: 3.4 }, { name: "Kestrel Pharma plc", weightPercent: 3.1 },
      { name: "Tamarind Motors Ltd", weightPercent: 2.8 }, { name: "Alpenhof Insurance AG", weightPercent: 2.5 },
    ],
  },
  {
    symbol: "QBYT", name: "Quantabyte Systems", type: "stock", area: "Technology", risk: "high", price: 142.75,
    issuer: "Quantabyte Systems Inc.", region: "US", dividendYieldPercent: 0, size: 86_000_000_000, inceptionDate: "2012-02-08",
    description: "A software and data-centre company that sells cloud tools to businesses. Its income depends on a few large product lines and on how much companies spend on technology.",
    riskNote: "A single company, so one bad product cycle or earnings miss can move the price sharply. It pays no dividend.",
  },
  {
    symbol: "TKFD", name: "Techfield Innovation Fund", type: "fund", area: "Technology", risk: "high", price: 74.3,
    issuer: "Techfield Capital", region: "Global", dividendYieldPercent: 0.3, size: 2_100_000_000, inceptionDate: "2018-03-19",
    description: "Invests in fast-growing technology companies around the world, from chips to online services. Holding many companies softens the impact of any one failure but keeps exposure to the whole sector.",
    riskNote: "Technology shares can fall together. Drops of 40% or more have followed periods of fast gains.",
    holdings: [
      { name: "Quanta Chipworks", weightPercent: 8.2 }, { name: "Lumina Cloud Inc", weightPercent: 7.4 },
      { name: "Vertex Robotics", weightPercent: 5.9 }, { name: "Pixelforge Games", weightPercent: 4.6 },
      { name: "Nimbly Payments", weightPercent: 4.1 },
    ],
  },
  {
    symbol: "HLVN", name: "Helvane Health Sciences Fund", type: "fund", area: "Healthcare", risk: "medium", price: 96.1,
    issuer: "Helvane Partners", region: "Global", dividendYieldPercent: 1.1, size: 950_000_000, inceptionDate: "2015-06-30",
    description: "Holds hospital groups, medical device makers and drug companies. Demand for healthcare tends to hold up when the economy slows, although prices still move with the market.",
    riskNote: "Rules about drug prices and trial results can change company values quickly. Sector funds are less diversified than a whole-market fund.",
    holdings: [
      { name: "Verity Pharma Ltd", weightPercent: 7.8 }, { name: "Corewell Diagnostics", weightPercent: 6.3 },
      { name: "Linden Hospital Group", weightPercent: 5.5 }, { name: "Optiva Medical Devices", weightPercent: 4.7 },
    ],
  },
  {
    symbol: "BIRX", name: "Biorix Therapeutics", type: "stock", area: "Healthcare", risk: "high", price: 38.6,
    issuer: "Biorix Therapeutics Ltd.", region: "US", dividendYieldPercent: 0, size: 4_200_000_000, inceptionDate: "2019-10-02",
    description: "A research company developing treatments for rare diseases. It earns little today and its value rests mostly on whether its trial drugs are approved.",
    riskNote: "A failed trial can cut the price by half in a day, and a success can lift it just as fast. It pays no dividend.",
  },
  {
    symbol: "SUNV", name: "Sunvale Clean Energy Fund", type: "fund", area: "Clean energy", risk: "high", price: 54.2,
    issuer: "Sunvale Investments", region: "Global", dividendYieldPercent: 0.8, size: 1_600_000_000, inceptionDate: "2016-04-11",
    description: "Invests in solar, wind, battery and grid companies. Returns depend on energy prices, government support and how quickly new projects get built.",
    riskNote: "Policy changes and interest rates have a strong effect on this sector. Prices have swung widely from year to year.",
    holdings: [
      { name: "Heliora Solar", weightPercent: 6.7 }, { name: "Galewind Turbines", weightPercent: 5.9 },
      { name: "Voltcell Batteries", weightPercent: 5.2 }, { name: "Gridline Networks", weightPercent: 4.4 },
      { name: "Tidal Power Co", weightPercent: 3.8 },
    ],
  },
  {
    symbol: "WNDA", name: "Windara Renewables", type: "stock", area: "Clean energy", risk: "medium", price: 27.9,
    issuer: "Windara Renewables plc", region: "Europe", dividendYieldPercent: 2.6, size: 9_400_000_000, inceptionDate: "2010-11-15",
    description: "Builds and runs wind farms and sells the electricity under long contracts. Steady contract income supports a regular dividend.",
    riskNote: "Income depends on weather, power prices and the cost of borrowing for new farms. It is one company in one sector.",
  },
  {
    symbol: "EDUK", name: "Edukai Learning Group", type: "stock", area: "Education", risk: "medium", price: 63.45,
    issuer: "Edukai Learning Group", region: "US", dividendYieldPercent: 0.9, size: 12_000_000_000, inceptionDate: "2013-01-21",
    description: "Runs online courses, tutoring services and test-preparation programmes. Subscriptions give it recurring income, but it competes with many free learning sites.",
    riskNote: "Student numbers and school budgets can change quickly, and new competitors are common. It is one company, so results vary more than a fund.",
  },
  {
    symbol: "LRNX", name: "Learnix Education Fund", type: "fund", area: "Education", risk: "medium", price: 41.8,
    issuer: "Learnix Asset Partners", region: "Global", dividendYieldPercent: 1.2, size: 410_000_000, inceptionDate: "2020-08-17",
    description: "Holds companies that teach, train and publish, from universities to language apps. It spreads money across the learning industry rather than relying on one provider.",
    riskNote: "A small, newer fund focused on one sector. It can lag the wider market for long periods.",
    holdings: [
      { name: "Edubridge Online", weightPercent: 7.1 }, { name: "Lingua Apps Ltd", weightPercent: 6.2 },
      { name: "Campus Books Group", weightPercent: 5.0 },
    ],
  },
  {
    symbol: "IRVL", name: "Ironvale Defense", type: "stock", area: "Weapons & defense", risk: "medium", price: 188.2,
    issuer: "Ironvale Defense Corp.", region: "US", dividendYieldPercent: 1.7, size: 54_000_000_000, inceptionDate: "2009-07-06",
    description: "Builds vehicles, radar and munitions mainly for national governments. Multi-year contracts make revenue fairly predictable.",
    riskNote: "Depends on government budgets and political decisions. Some investors choose to avoid this industry on ethical grounds.",
  },
  {
    symbol: "AEGX", name: "Aegira Security & Defense Fund", type: "fund", area: "Weapons & defense", risk: "medium", price: 87.65,
    issuer: "Aegira Funds", region: "Global", dividendYieldPercent: 1.5, size: 1_100_000_000, inceptionDate: "2017-02-27",
    description: "Holds defence manufacturers and security technology firms from several countries. It spreads the risk of any single contract across many suppliers.",
    riskNote: "Tied to defence spending cycles and politics. Some investors choose to avoid this industry on ethical grounds.",
    holdings: [
      { name: "Ironclad Aerospace", weightPercent: 8.9 }, { name: "Sentinel Radar Systems", weightPercent: 6.8 },
      { name: "Bastion Naval Works", weightPercent: 5.4 }, { name: "Cipher Secure Networks", weightPercent: 4.2 },
    ],
  },
  {
    symbol: "AURC", name: "Aurelia Coin", type: "crypto", area: "Crypto", risk: "high", price: 4120.5,
    issuer: "Aurelia Network Foundation", region: "Global", dividendYieldPercent: 0, size: 780_000_000_000, inceptionDate: "2013-05-10",
    description: "A digital currency that runs on an open network with no bank or company in charge. Its price is set by what buyers and sellers are willing to pay, and it pays no income.",
    riskNote: "Prices can fall by half within months. Rules for digital assets vary by country and can change.",
  },
  {
    symbol: "NMBS", name: "Nimbus Token", type: "crypto", area: "Crypto", risk: "high", price: 312.4,
    issuer: "Nimbus Labs", region: "Global", dividendYieldPercent: 0, size: 95_000_000_000, inceptionDate: "2025-06-03",
    description: "A newer digital token used to pay fees on an online computing network. Its value depends on how many people use that network.",
    riskNote: "A young asset with a short price history. It can lose most of its value, and it pays no income.",
  },
  {
    symbol: "CRNP", name: "Cornerstone Property Trust", type: "stock", area: "Real estate", risk: "medium", price: 72.3,
    issuer: "Cornerstone Realty Group", region: "US", dividendYieldPercent: 4.4, size: 6_800_000_000, inceptionDate: "2008-03-14",
    description: "Owns apartment blocks, warehouses and offices and collects rent from tenants. Most of the rent income is paid out to shareholders as dividends.",
    riskNote: "Property values and the dividend fall when interest rates rise or tenants leave. It is one company, so results can differ from the wider property market.",
  },
  {
    symbol: "EGBF", name: "Evergreen Government Bond Fund", type: "bond", area: "Government bonds", risk: "low", price: 101.35,
    issuer: "Evergreen Fixed Income", region: "US", dividendYieldPercent: 3.6, size: 5_200_000_000, inceptionDate: "2006-01-09",
    description: "Lends money to the government by holding a mix of its medium and long-term bonds. It pays regular interest and tends to be much calmer than shares.",
    riskNote: "Bond prices fall when interest rates rise, and longer bonds fall more. Returns may not keep up with inflation.",
  },
  {
    symbol: "SGTL", name: "Shortgate 2-Year Treasury Ladder", type: "bond", area: "Government bonds", risk: "low", price: 49.85,
    issuer: "Shortgate Capital", region: "US", dividendYieldPercent: 4.1, size: 780_000_000, inceptionDate: "2019-05-20",
    description: "Holds government bonds that mature within about two years and replaces them as they expire. Short maturities keep price swings small.",
    riskNote: "Yields reset as bonds roll over, so income can fall when rates fall. Prices barely move, but returns may trail inflation.",
  },
  {
    symbol: "PNTL", name: "Pantryline Consumer Staples", type: "stock", area: "Consumer goods", risk: "low", price: 109.6,
    issuer: "Pantryline Brands Inc.", region: "US", dividendYieldPercent: 3, size: 38_000_000_000, inceptionDate: "2005-09-02",
    description: "Makes food, cleaning products and household basics that people buy in any economy. Demand is steady, so earnings and dividends have been stable.",
    riskNote: "Growth is usually slow, and rising ingredient costs or private-label competition can squeeze profit. It is still one company.",
  },
];
