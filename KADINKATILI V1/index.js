"use strict";
const tls = require("tls");
const WebSocket = require("ws");
const extractJsonFromString = require("extract-json-from-string");
const performanceNow = require("performance-now");
let vanity;
const guilds = {};

function reconnect() {
    tlsSocket.connect({
        host: "canary.discord.com",
        port: 8443,
    });
}

const tlsSocket = tls.connect({
    host: "canary.discord.com",
    port: 8443,
});

tlsSocket.on("data", async (data) => {
    const extractedData = extractJsonFromString(data.toString());
    const foundData =
        extractedData.find((e) => e.code) || extractedData.find((e) => e.message);
    if (foundData) {
        const requestBody = JSON.stringify({
            content: `@everyone https://discord.gg/${vanity} \n${JSON.stringify(foundData.code)}`,
        });
        const contentLength = Buffer.byteLength(requestBody);
        const requestHeader = [
            "POST /api/v7/channels/LOG KANALI IDSI/messages HTTP/1.1",
            "Host: canary.discord.com",
            "Authorization: TOKEN",
            "Content-Type: application/json",
            `Content-Length: ${contentLength}`,
            "",
            "",
        ].join("\r\n");
        const request = requestHeader + requestBody;
        tlsSocket.write(request);
    }
});

tlsSocket.on("error", (error) => {
    console.error("TLS soketi hatası:", error);
    reconnect();
});

tlsSocket.on("end", () => {
    console.log("TLS soketi kapatıldı.");
    reconnect();
});

tlsSocket.on("secureConnect", () => {
    const websocket = new WebSocket("wss://gateway-us-east1-b.discord.gg");
    websocket.onclose = () => {
        console.log("WebSocket kapatıldı.");
        reconnect();
    };
    websocket.onmessage = async (message) => {
        const { d, op, t } = JSON.parse(message.data);
        if (t === "GUILD_UPDATE") {
            const foundGuild = guilds[d.guild_id];
            if (foundGuild && foundGuild !== d.vanity_url_code) {
                const requestBody = JSON.stringify({ code: foundGuild });
                const request = [
                    "PATCH /api/v7/guilds/SUNUCU IDSI/vanity-url HTTP/1.1",
                    "Host: canary.discord.com",
                    'Authorization: TOKEN',
                    "Content-Type: application/json",
                    `Content-Length: ${requestBody.length}`,
                    "",
                    "",
                ].join("\r\n") + requestBody;
                tlsSocket.write(request);
                vanity = `${foundGuild}`;
            }
        } else if (t === "GUILD_DELETE") {
            const foundGuild = guilds[d.id];
            if (foundGuild) {
                const requestBody = JSON.stringify({ code: foundGuild });
                const request = [
                    "PATCH /api/v7/guilds/SUNUCU IDSI/vanity-urlHTTP/1.1",
                    "Host: canary.discord.com",
                    'Authorization: TOKEN',
                    "Content-Type: application/json",
                    `Content-Length: ${requestBody.length}`,
                    "",
                    "",
                ].join("\r\n") + requestBody;
                tlsSocket.write(request);
                vanity = `${foundGuild}`;
            }
        } else if (t === "READY") {
            d.guilds.forEach((guild) => {
                if (guild.vanity_url_code) {
                    guilds[guild.id] = guild.vanity_url_code;
                }
            });
        }
        if (op === 10) {
            websocket.send(
                JSON.stringify({
                    op: 2,
                    d: {
                        token: "TOKEN",
                        intents: 513 << 0,
                        properties: {
                            os: "linux",
                            browser: "FireFox",
                            device: "desktop",
                        },
                    },
                })
            );
            setInterval(
                () =>
                    websocket.send(
                        JSON.stringify({ op: 0.1, d: {}, s: null, t: "heartbeat" })
                    ),
                d.heartbeat_interval
            );
        } else if (op === 7) {
            console.log("Gateway bağlantısı kapatıldı.");
            reconnect();
        }
    };
    setInterval(() => {
        tlsSocket.write(["GET / HTTP/1.1", "Host: canary.discord.com", "", ""].join("\r\n"));
    }, 7500);
});