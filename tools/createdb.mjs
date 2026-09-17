import { createRequire } from "module";
import { fakerPL as faker } from "@faker-js/faker";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");

const config = {
  dbfilename: "./data/przychodnia-v2-dev.sqlite3",
  LICZBA_PACJENTOW: 50,
  LICZBA_LEKARZY: 10,
  LICZBA_PRACOWNIKOW: 3,
  LICZBA_GABINETOW: 15,
  LICZBA_WIZYT: 150,
};

console.log("Tworzenie nowej bazy danych");
const connection = new Database(config.dbfilename);
connection.pragma("foreign_keys = ON");

//Tabela Gabinety
console.log("Tworzenie tabeli Gabinety");
connection.exec(`
    CREATE TABLE IF NOT EXISTS gabinety (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        numer_gabinetu TEXT UNIQUE NOT NULL 
    )
`);

const insertGabinet = connection.prepare(
  "INSERT OR IGNORE INTO gabinety (numer_gabinetu) VALUES (?)",
);
connection.transaction(() => {
  for (let i = 0; i < config.LICZBA_GABINETOW; i++) {
    insertGabinet.run(`${100 + i}`);
  }
})();

console.log("Baza Gabinetów została wygenerowana");

//Tabela Osoby
console.log("Tworzenie tabeli Osoby");
connection.exec(`
    CREATE TABLE IF NOT EXISTS osoby (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        imie TEXT NOT NULL,
        nazwisko TEXT NOT NULL,
        email TEXT,
        telefon TEXT,
        utworzono_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        zaktualizowano_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

console.log("Tabela Osoby została utworzona");

const insertOsoba = connection.prepare(`
    INSERT INTO osoby (imie, nazwisko, email, telefon)
    VALUES (?, ?, ?, ?)
`);

//Tabela Pacjenci
console.log("Tworzenie tabeli Pacjenci");
connection.exec(`
    CREATE TABLE IF NOT EXISTS pacjenci (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    osoba_id INTEGER UNIQUE NOT NULL,
    imie TEXT NOT NULL,
    nazwisko TEXT NOT NULL,
    pesel TEXT UNIQUE NOT NULL,
    data_urodzenia DATE,
    email TEXT,
    czy_aktywny BOOLEAN DEFAULT 1,
    FOREIGN KEY(osoba_id) REFERENCES osoby(id) ON DELETE RESTRICT
)
`);

const insertPacjent = connection.prepare(`
    INSERT OR IGNORE INTO pacjenci
    (osoba_id, imie, nazwisko, pesel, data_urodzenia, email)
    VALUES (?, ?, ?, ?, ?, ?)
`);

connection.transaction(() => {
  for (let i = 0; i < config.LICZBA_PACJENTOW; i++) {
    const imie = faker.person.firstName();
    const nazwisko = faker.person.lastName();
    const dataObiekt = faker.date.birthdate({ min: 18, max: 90, mode: "age" });
    const rok = dataObiekt.getFullYear();
    const miesiac = dataObiekt.getMonth() + 1;
    const dzien = dataObiekt.getDate();
    const data_urodzenia = dataObiekt.toISOString().split("T")[0];
    const yy = String(rok).slice(-2);
    const mm = String(miesiac).padStart(2, "0");
    const dd = String(dzien).padStart(2, "0");
    const koncowka = faker.string.numeric(5);
    const pesel = `${yy}${mm}${dd}${koncowka}`;
    const email = faker.internet
      .email({ firstName: imie, lastName: nazwisko })
      .toLowerCase();

    const osobaResult = insertOsoba.run(imie, nazwisko, email, null);

    const osoba_id = Number(osobaResult.lastInsertRowid);

    insertPacjent.run(osoba_id, imie, nazwisko, pesel, data_urodzenia, email);
  }
})();

console.log("Baza Pacjentów została wygenerowana");

//Tabela Lekarze
console.log("Tworzenie tabeli Lekarze");
connection.exec(`
   CREATE TABLE IF NOT EXISTS lekarze (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    osoba_id INTEGER UNIQUE NOT NULL,
    imie TEXT NOT NULL,
    nazwisko TEXT NOT NULL,
    specjalizacja TEXT,
    email TEXT,
    gabinet_id INTEGER UNIQUE,
    czy_aktywny BOOLEAN DEFAULT 1,

    FOREIGN KEY(osoba_id) REFERENCES osoby(id) ON DELETE RESTRICT,
    FOREIGN KEY(gabinet_id) REFERENCES gabinety(id)
)
`);

const specjalizacje = [
  "Kardiolog",
  "Pediatra",
  "Chirurg",
  "Okulista",
  "Dermatolog",
  "Neurolog",
  "Stomatolog",
  "Ortopeda",
  "Urolog",
];

const insertLekarz = connection.prepare(`
    INSERT OR IGNORE INTO lekarze
    (osoba_id, imie, nazwisko, specjalizacja, email, gabinet_id)
    VALUES (?, ?, ?, ?, ?, ?)
`);

connection.transaction(() => {
  for (let i = 0; i < config.LICZBA_LEKARZY; i++) {
    const imie = faker.person.firstName();
    const nazwisko = faker.person.lastName();
    const spec = faker.helpers.arrayElement(specjalizacje);
    const email = faker.internet
      .email({ firstName: imie, lastName: nazwisko })
      .toLowerCase();
    const gabinet_id = i + 1;

    const osobaResult = insertOsoba.run(imie, nazwisko, email, null);

    const osoba_id = Number(osobaResult.lastInsertRowid);

    insertLekarz.run(osoba_id, imie, nazwisko, spec, email, gabinet_id);
  }
})();

console.log("Baza Lekarzy została wygenerowana");

//Tabela Pracownicy
console.log("Tworzenie tabeli Pracownicy");

connection.exec(`
    CREATE TABLE IF NOT EXISTS pracownicy (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        osoba_id INTEGER UNIQUE NOT NULL,
        stanowisko TEXT NOT NULL,
        czy_aktywny BOOLEAN DEFAULT 1,

        FOREIGN KEY(osoba_id) REFERENCES osoby(id) ON DELETE RESTRICT
    )
`);

const insertPracownik = connection.prepare(`
    INSERT INTO pracownicy (osoba_id, stanowisko)
    VALUES (?, ?)
`);
const stanowiska = ["Administrator", "Recepcja", "Recepcja"];

connection.transaction(() => {
  for (let i = 0; i < config.LICZBA_PRACOWNIKOW; i++) {
    const imie = faker.person.firstName();
    const nazwisko = faker.person.lastName();

    const email = faker.internet
      .email({ firstName: imie, lastName: nazwisko })
      .toLowerCase();

    const osobaResult = insertOsoba.run(imie, nazwisko, email, null);

    const osoba_id = Number(osobaResult.lastInsertRowid);

    insertPracownik.run(osoba_id, stanowiska[i]);
  }
})();

console.log("Tabela Pracownicy została utworzona");

//Tabela Wizyty
console.log("Tworzenie tabeli Wizyty");
connection.exec(`
    CREATE TABLE IF NOT EXISTS wizyty (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pacjent_id INTEGER,
        lekarz_id INTEGER,
        gabinet_id INTEGER,
        data DATETIME NOT NULL,
        status TEXT DEFAULT 'zaplanowana',
        uwagi_do_statusu TEXT,
        FOREIGN KEY(pacjent_id) REFERENCES pacjenci(id),
        FOREIGN KEY(lekarz_id) REFERENCES lekarze(id),
        FOREIGN KEY(gabinet_id) REFERENCES gabinety(id)
    )
`);

const statusy = ["zaplanowana", "odbyta", "anulowana"];
const pacjentIds = connection
  .prepare("SELECT id FROM pacjenci")
  .all()
  .map((pacjent) => pacjent.id);

const lekarzeDoWizyt = connection
  .prepare("SELECT id, gabinet_id FROM lekarze")
  .all();

const gabinetIds = connection
  .prepare("SELECT id FROM gabinety")
  .all()
  .map((gabinet) => gabinet.id);
const insertWizyta = connection.prepare(
  "INSERT INTO wizyty (pacjent_id, lekarz_id, gabinet_id, data, status, uwagi_do_statusu) VALUES (?, ?, ?, ?, ?, ?)",
);
connection.transaction(() => {
  for (let i = 0; i < config.LICZBA_WIZYT; i++) {
    const pacjent_id = faker.helpers.arrayElement(pacjentIds);

    const lekarz = faker.helpers.arrayElement(lekarzeDoWizyt);
    const lekarz_id = lekarz.id;
    const gabinet_id = lekarz.gabinet_id;

    const dataObiekt = faker.date.soon({ days: 30 });
    const rok = dataObiekt.getFullYear();
    const miesiac = String(dataObiekt.getMonth() + 1).padStart(2, "0");
    const dzien = String(dataObiekt.getDate()).padStart(2, "0");
    const godzina = String(faker.number.int({ min: 8, max: 16 })).padStart(
      2,
      "0",
    );
    const minuty = String(faker.helpers.arrayElement([0, 15, 30, 45])).padStart(
      2,
      "0",
    );
    const sformatowanaData = `${rok}-${miesiac}-${dzien}T${godzina}:${minuty}:00`;
    const status = faker.helpers.arrayElement(statusy);
    const uwagi = status === "anulowana" ? "Odwołano telefonicznie" : null;

    insertWizyta.run(
      pacjent_id,
      lekarz_id,
      gabinet_id,
      sformatowanaData,
      status,
      uwagi,
    );
  }
})();

console.log("Baza Wizyt została wygenerowana");

//Tabela Audyt
console.log("Tworzenie tabeli Audyt");
connection.exec(`
    CREATE TABLE IF NOT EXISTS audyt (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uzytkownik TEXT NOT NULL,
        operacja TEXT NOT NULL,
        szczegoly TEXT NOT NULL,
        data DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

const insertAudyt = connection.prepare(
  "INSERT INTO audyt (uzytkownik, operacja, szczegoly) VALUES (?, ?, ?)",
);
insertAudyt.run(
  "System",
  "INICJALIZACJA",
  "Wygenerowano nową bazę danych przychodni.",
);

console.log("Baza Audytów została wygenerowana");

//Tabela Chat
console.log("Tworzenie tabeli Wiadomości Czat");
connection.exec(`
    CREATE TABLE IF NOT EXISTS wiadomosci_chat (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        autor TEXT NOT NULL,
        odbiorca TEXT NOT NULL,
        tresc TEXT NOT NULL,
        data_wyslania DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

console.log("Baza Chatu została wygenerowana");

console.log("Pełna baza danych została wygenerowana");
