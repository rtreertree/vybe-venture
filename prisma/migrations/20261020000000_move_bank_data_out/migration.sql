-- Cash, products, price history, holdings and orders now live in the external bank database.
DROP TABLE IF EXISTS "BankOrder";
DROP TABLE IF EXISTS "BankHolding";
DROP TABLE IF EXISTS "BankPricePoint";
DROP TABLE IF EXISTS "BankProductHolding";
DROP TABLE IF EXISTS "BankProduct";
DROP TABLE IF EXISTS "BankUser";
