import express, { Request, Response } from 'express';
import http from 'http';
import morgan from 'morgan';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { pacjenciRouter } from './api/pacjenci';
import { lekarzeRouter } from './api/lekarze';
import { gabinetyRouter } from './api/gabinety';
import { wizytyRouter } from './api/wizyty';
import { audytRouter } from './api/audyt';
import { szukajRouter } from './api/szukaj';
import bcrypt from "bcryptjs";

const CONFIG_PATH = path.resolve('config.json');

function loadConfig() {
    if (!fs.existsSync(CONFIG_PATH)) {
        console.error(`Brak pliku konfiguracyjnego: ${CONFIG_PATH}`);
        process.exit(1);
    }
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
}

const config = loadConfig();

async function main() {
    const app = express();

    app.use(cors());
    app.use(morgan('tiny'));
    app.use(express.json());

    const connection = new Database(config.dbfilename);
    connection.pragma('foreign_keys = ON');

    // Funkcja pomocnicza zapewnia sortowanie zgodne z polskim alfabetem w SQLite.
    connection.function('polish_sort_key', { deterministic: true }, (s: unknown) => {
        if (typeof s !== 'string') return s;
        const sortMap: Record<string, string> = {
            'ą': 'a\x01', 'Ą': 'A\x01',
            'ć': 'c\x01', 'Ć': 'C\x01',
            'ę': 'e\x01', 'Ę': 'E\x01',
            'ł': 'l\x01', 'Ł': 'L\x01',
            'ń': 'n\x01', 'Ń': 'N\x01',
            'ó': 'o\x01', 'Ó': 'O\x01',
            'ś': 's\x01', 'Ś': 'S\x01',
            'ź': 'z\x01', 'Ź': 'Z\x01',
            'ż': 'z\x02', 'Ż': 'Z\x02',
        };
        return [...s].map(c => sortMap[c] ?? c).join('');
    });

    app.use('/api/pacjenci', pacjenciRouter(connection));
    app.use('/api/lekarze', lekarzeRouter(connection));
    app.use('/api/gabinety', gabinetyRouter(connection));
    app.use('/api/wizyty', wizytyRouter(connection));
    app.use('/api/audyt', audytRouter(connection));
    app.use('/api/szukaj', szukajRouter(connection));

    console.log('Baza danych przychodni podłączona pomyślnie');

    app.get('/api/status', (req: Request, res: Response) => {
        res.json({ wiadomosc: 'Witaj w nowym systemie kliniki! Serwer działa.' });
    });

    // POST /api/auth — uwierzytelnienie użytkownika i przypisanie roli
   app.post('/api/auth', (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            error: 'Podaj login i hasło'
        });
    }

    const konto = connection.prepare(`
        SELECT
            k.id,
            k.osoba_id,
            k.login,
            k.haslo_hash,
            k.aktywne,
            k.zablokowane,
            k.wymus_zmiane_hasla
        FROM konta_uzytkownikow k
        WHERE k.login = ? COLLATE NOCASE
    `).get(username) as any;

    if (!konto) {
        return res.status(401).json({
            error: 'Błędny login lub hasło'
        });
    }

    if (!konto.aktywne || konto.zablokowane) {
        return res.status(403).json({
            error: 'Konto jest niedostępne'
        });
    }

    const poprawneHaslo = bcrypt.compareSync(
        password,
        konto.haslo_hash
    );

    if (!poprawneHaslo) {
        return res.status(401).json({
            error: 'Błędny login lub hasło'
        });
    }

    const role = connection.prepare(`
        SELECT r.nazwa
        FROM konta_role kr
        JOIN role r ON r.id = kr.rola_id
        WHERE kr.konto_id = ?
          AND kr.aktywna = 1
    `).all(konto.id) as { nazwa: string }[];

    const mapaRol: Record<string, number> = {
        ADMIN: 0,
        LEKARZ: 1,
        RECEPCJA: 2,
        PACJENT: 3
    };

    const roles = role
        .map(r => mapaRol[r.nazwa])
        .filter(r => r !== undefined);

    return res.json({
        id: konto.id,
        username: konto.login,
        roles,
        mustChangePassword: Boolean(konto.wymus_zmiane_hasla)
    });
});

    app.get('/api/auth', (req: Request, res: Response) => {
        res.json(null);
    });

    app.delete('/api/auth', (req: Request, res: Response) => {
        res.status(204).send();
    });

    // GET /api/chat/historia — pobranie ostatnich wiadomości
    app.get('/api/chat/historia', (req: Request, res: Response) => {
        try {
            const stmt = connection.prepare(`
                SELECT 
                    autor AS author, 
                    odbiorca AS "to", 
                    tresc AS text, 
                    data_wyslania AS time 
                FROM wiadomosci_chat 
                ORDER BY data_wyslania ASC 
                LIMIT 150
            `);
            const messages = stmt.all();
            res.json(messages);
        } catch (error) {
            console.error('Błąd pobierania historii czatu:', error);
            res.status(500).json({ error: 'Błąd serwera' });
        }
    });

    const httpServer = http.createServer(app);

    // Obsługa czatu i powiadomień przez WebSocket
    const wss = new WebSocketServer({ server: httpServer });
    app.set('wss', wss);

    wss.on('connection', (ws) => {
        ws.on('message', (message) => {
            const msgString = message.toString();
            try {
                const msg = JSON.parse(msgString);
                if (msg.author && msg.to && msg.text) {
                    const stmt = connection.prepare('INSERT INTO wiadomosci_chat (autor, odbiorca, tresc) VALUES (?, ?, ?)');
                    stmt.run(msg.author, msg.to, msg.text);
                }
            } catch (err) {
                console.error("Błąd zapisu do bazy:", err);
            }

            wss.clients.forEach((client) => {
                if (client.readyState === 1) {
                    client.send(msgString);
                }
            });
        });
    });

    httpServer.listen(config.port, () => {
        console.log(`Serwer wystartował na porcie ${config.port}`);
    });
}

main().catch(err => {
    console.error(`Błąd uruchomienia serwera [${err.code}]: ${err.message}`);
    process.exit(1);
});