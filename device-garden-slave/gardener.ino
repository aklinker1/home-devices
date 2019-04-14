/**
 * Simple project that turns on pumps when a post call is recieved. Below are the endpoints:
 * 
 * Endpoints:
 *  - GET /
 *    Returns a 200 when the arduino server is running.
 *    
 *  - GET /water
 *    Returns a list of all the pins whose pumps have been turned on in the last POST to this
 *    endpoint. It also returns the number of mL that have been used, and the time in ms that
 *    each pump is/was on for.
 *    
 *  - POST /water
 *    Waters the plants by turning on the requested pumps to provide the given number of mL 
 *    to each on.
 *    BODY: 
 *    [
 *      {
 *        "pin": number,
 *        "mL": number
 *      },
 *      ...
 *    ]
 * 
 * Other Docs:
 *  - Pinout: http://www.electronicwings.com/public/images/user_images/images/NodeMCU/NodeMCU%20Basics%20using%20Arduino%20IDE/NodeMCU%20GPIO/NodeMCU%20GPIOs.png
 */
#include <ESP8266WiFi.h>
#include <WiFiClient.h>
#include <ESP8266WebServer.h>
#include <ESP8266mDNS.h>
#include <ArduinoJson.h>
#include "Plant.hpp"

const size_t MAX_PLANTS = 8;
const int PIN_MAP[] = {
  16,  // D0
  5,   // D1
  4,   // D2
  0,   // D3
  2,   // D4
  14,  // D5
  12,  // D6
  13,  // D7
  15,  // D8
};

ESP8266WebServer server(8080);
Plant plants[MAX_PLANTS];
int plantCount = 0;

void connectWiFi(char* ssid, char* password) {
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  Serial.print("\nConnecting to '");
  Serial.print(ssid);
  Serial.println("'...");

  int i = 0;
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(". ");
    delay(1000);
  }
  
  Serial.println("");
  Serial.println("Connected!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
}

/**
 * LOW = on    HIGH = off
 */
void led(int pin, bool on) {
  digitalWrite(pin, on ? LOW : HIGH);
}

void pump(int pin, bool on) {
  Serial.print("Pin D");
  Serial.print(pin);
  Serial.print(" (GPIO #");
  Serial.print(PIN_MAP[pin]);
  Serial.print(") ");
  Serial.println(on ? " on!" : " off.");
  digitalWrite(PIN_MAP[pin], on ? HIGH : LOW);
}

String plantsToJSON() {
  String response = "[ ";
  for (int i = 0; i < plantCount; ++i) {
    response += plants[i].toJSON();
    if (i == plantCount - 1) response += " ";
    else response += ", ";
  }
  return response + "]";
}

void getPlants() {
  server.send(200, "application/json", plantsToJSON());
}

void postPlants() {
  String json = server.arg("plain");
  
  const size_t bufferSize = JSON_ARRAY_SIZE(MAX_PLANTS) + MAX_PLANTS*JSON_OBJECT_SIZE(4) + 200;
  DynamicJsonBuffer jsonBuffer(bufferSize);
  JsonArray& root = jsonBuffer.parseArray(json);
  plantCount = root.size();
  
  Serial.print("Watering ");
  Serial.print(plantCount);
  Serial.println(" plants...");

  long receivedAt = millis();

  for (int i = 0; i < root.size(); ++i) {
    JsonObject& plantJson = root[i];
    int mL = plantJson["mL"];
    int pin = plantJson["pin"];
    pump(pin, true);
    plants[i] = Plant(receivedAt, mL, pin);
  }

  server.send(200, "application/json", plantsToJSON());
}

void getDiscover() {
  led(LED_BUILTIN, false);
  server.send(
    200,
    "application/json",
    "{"
    "  \"id\": \"outdoor_arduino_1\","
    "  \"name\": \"Outdoor Garden Arduino\","
    "  \"type\": \"garden_slave\","
    "  endpoints: ["
    "    [\"GET\", \"/water\"],"
    "    [\"POST\", \"/water\"]"
    "  ]"
    "}"
  );
  led(LED_BUILTIN, true);
}

void handleNotFound() {
  led(LED_BUILTIN, false);
  String message = "Endpoint not found...\n\n";
  message += "URI: ";
  message += server.uri();
  message += "\nMethod: ";
  message += (server.method() == HTTP_GET) ? "GET" : "POST";
  message += "\nArguments: ";
  message += server.args();
  message += "\n";
  for (uint8_t i = 0; i < server.args(); i++) {
    message += "  - " + server.argName(i) + ": " + server.arg(i) + "\n";
  }
  for (uint8_t i = 0; i < server.headers(); i++) {
    message += "  - " + server.headerName(i) + ": " + server.header(i) + "\n";
  }
  server.send(404, "text/plain", message);
  led(LED_BUILTIN, true);
}



void setup() {
  Serial.begin(115200);
  delay(10);
  for (int i = 0; i < 9; ++i) {
    pinMode(PIN_MAP[i], OUTPUT);
  }
  pinMode(LED_BUILTIN, OUTPUT);
  led(LED_BUILTIN, false);
  connectWiFi("AaronsFunHouse", "fishrfriends");
  if (MDNS.begin("esp8266")) {
    Serial.println("MDNS responder started");
  }
  led(LED_BUILTIN, true);
  
  server.on("/discover", HTTP_GET, getDiscover);
  server.on("/water", HTTP_GET, getPlants);
  server.on("/water", HTTP_POST, postPlants);
  server.onNotFound(handleNotFound);
  server.begin();
}

long prevMs = 0;
void loop() {
  // handle requests
  server.handleClient();

  // update pumps
  long currentMs = millis();
  for (int i = 0; i < plantCount; ++i) {
    // if the current time is after/eqaual to the stopping time and the previous time is before the stopping time, stop the pump
    if (currentMs >= plants[i].waterUntilMs && prevMs < plants[i].waterUntilMs) pump(plants[i].pin, false);
  }
  prevMs = currentMs;
}
