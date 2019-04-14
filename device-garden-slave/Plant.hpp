#pragma

const int MS_PER_ML = 1000;

class Plant {
private:
public:
  long startedAtMs;
  long waterUntilMs;
  int pin;
  int mL;
  Plant() {
    this->startedAtMs = 0;
    this->waterUntilMs = 0;
    this->mL = 0;
    this->pin = -1;
  }
  Plant(long startedAtMs, int mL, int pin) {
    this->mL = mL;
    this->pin = pin;
    this->startedAtMs = startedAtMs;
    this->waterUntilMs = startedAtMs + mL * MS_PER_ML;
  }
  String toJSON() {
    String json = "{ ";
    json += "\"durationMs\": ";
    json += (this->waterUntilMs - this->startedAtMs);
    json += ", \"mL\": ";
    json += this->mL;
    json += ", \"pin\": ";
    json += this->pin;
    json += " }";
    return json;
  }
};
