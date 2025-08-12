// Author: Ron Spooner
// Ward/Davis Associate Retired
// W6FIF   w6fif@arrl.net
// 805 558 1188   rspooner@warddavis.com

// compact sketch for sending Morse code.              MASTER          W6FIF   Ron Spooner July 10, 2025.  V2.4
// modified to provide security for K7ID on Mica Peak.
// The LetterArray and the mCodeArray have corresponding elements      elem.0 in one relates to elem.0 in the other.
// ORDER OF MOST USED  EISTAHNDRUFB GLMVWCOJKQPXZY 0123456789  ?.,=/:!-'+        to least used
String LetterArray = " EISTAHNDRUFBGLMVWCOJKQPXZY0123456789?.,=/:!-'+";  //      most used to least used
//                             don't forget arrays are 0 base index!  first cell is a position 0.
// the MSB 1 is a terminator.  dits are 0   dahs are 1.  read from right to left.   0b1 is also space
int mCodeArray[48] = { 0b1, 0b10, 0b100, 0b1000, 0b11, 0b110, 0b10000, 0b101, 0b1001, 0b1010, 0b1100, 0b10100, 0b10001,
                       0b1011, 0b10010, 0b111, 0b11000, 0b1110, 0b10101, 0b1111, 0b11110, 0b1101, 0b11011, 0b10110, 0b11001,
                       0b10011, 0b11101, 0b111111, 0b111110, 0b111100, 0b111000, 0b110000, 0b100000, 0b100001, 0b100011, 0b100111,
                       0b101111, 0b1001100, 0b1101010, 0b1110011, 0b110001, 0b101001, 0b1000111, 0b110101, 0b1100001, 0b1010010, 0b101010 };
String test_message = "=  FB DE W6FIF NAME IS RON = QTH POST FALLS, ID = UR  RST 58N 589 RUNNING 100W IN TO END FED LONG WIRE ANTENNA.  BACK TO U W6FIF  K    ";  // <<==>> should be upper case

const byte Speaker_Pin = 3;         // tone output  set to musical tone A
const byte Intrusion_Pin = 12;      // simple magnetic switch on the door.
const byte Battery1Volt_Pin = A0;   // scale the 12v battery with resistor divider  input is 0 - 5V
const byte Battery2Volt_Pin = A1;   // measure a 2nd battery
const byte ACV_Volt_Pin = A2;       // scale the output of a 6 volt transformer to with divider seat AC voltage with cap and diode  0-5V
const byte ACC_Current_Pin = A3;    // input from current transformer
const byte Disable_Alarm_Pin = 10;  // used to disable intrusion alarm on and off.
const byte PTT_Pin = 11;            //  key the transmitter on
const byte LED_Pin = 13;            //  build in LED  but ALSO can generate a tone on pin 3 for Morse code.

const float FS_Battery_volt = 15.0;   // set batter reading full scale
const float FS_ACline_volt = 150.0;   // set AC line reading full scale
const float FS_ACline_Current = 30;   //  max current expected
const float Battery1_Volt_Cal = 1.0;  // ***** used to fine tune the accuracy of the reading  number determined by using a voltmeter
const float Battery2_Volt_Cal = 1.0;
const float ACV_Line_Volt_Cal = 1.0;  // ***** used to fine tune the accuracy of the reading  number determined by using a voltmeter
const float ACC_Line_Amps_Cal = 1.0;
const float Battery_Low_Limit = 12.0;  // ************************************  reporting limits here ***********************
const float Battery_Hi_Limit = 14.0;   // ************************************  reporting limits here ***********************
const float ACV_Low_Limit = 90;        // ************************************  reporting limits here ***********************
const float ACV_Hi_Limit = 140;        // ************************************  reporting limits here ***********************
const float ACC_Hi_Limit = 25;         // ************************************  reporting limits here ***********************
const byte WPM = 20;                   // set Morse code speed here   <<<<<<<<<<<<<<<<<<<<*******>>>>>>>>>>>>>>>>>>>>>>>>>>>>
const int ditTime = 1200 / WPM;        // 60000ms/50units = 1wpm --- PARIS  has 50 units
const int dahTime = ditTime * 3;
const int LetterSpaceTime = dahTime;
const int WordSpaceTime = ditTime * 7;

String Radio_ID = "DE K7ID/C = ";  // put radio ID here!! <<<<<<<<<<<<<<<<<<  ID <<<<<<<<< ID <<<<<<<<<<<<<<<<<<<<<<<<<<<
bool Disable_Alarm = false;        // used to turn off alarm reporting.  start with alarms enabled.

void SendDitDah(int x) {        //     if x = 0 send dit and if x = 1 send dah
  digitalWrite(LED_Pin, HIGH);  //     used to blink Morse code
  tone(Speaker_Pin, 3 * 440);   //     tone is musical note "A"  used to send Morse code over the  radio.    1320 Hz
  delay(ditTime);               //     a Dit is one unit long  a Dah time is 3*ditTime
  delay(ditTime * 2 * x);       //     x = 1 this is a Dah it needs 3 Dits of time.
  digitalWrite(LED_Pin, LOW);
  noTone(Speaker_Pin);
  delay(ditTime);  //                  spacing between dits and dahs
}

void PTT(bool XX) {  // this output drives a relay thru a OR diode set alowing the R-Pi to also drive the PPT relay (us a 2N2222)
  if (XX == true) {  // this looks like an extra step - but I am hoping it makes the code easier to read!
    digitalWrite(PTT_Pin, HIGH);
  } else {
    digitalWrite(PTT_Pin, LOW);
  }
}

void DecodeSend_DitDahsFor(char chr_value) {
  int bin_value;
  int index;
  index = LetterArray.indexOf(chr_value);  //      find position of char chr_value in the LetterArray
  if (index < 0) {                         //      if not found .indexOf returns -1  this is not good, but program does not crash.
    // Serial.println(" this is bad - char not found in LetterArray ");  // debug
    index = 1;  //                                 if char is not found just send a space.
  }
  bin_value = mCodeArray[index];               //  get the Morse # code associated with this char.
  if (bin_value == 1) delay(LetterSpaceTime);  //  if bin_value = 1 coming into the function that is a 'space'
  while (bin_value != 1) {                     //  shift register to the right and check the LSB for  1 or 0 ++++++++++++++++++++++++++++
    SendDitDah(bin_value & 0b1);               //  look at the LSB and send it in morse code
    bin_value = bin_value >> 1;                //  right shift  -  when the MSB is shifted to the LSB bin_value will be 1  and loop will end.
  }                                            //  end while <<<<<<<<<<<<<<<<<
}

void Send_Message(String MyMessage) {        //   sends the message if Disable_Alarm = true.
  if (Disable_Alarm_Reporting() == false) {  //   stop reporting if true
    PTT(true);                               //   key the transmitter
    delay(250);                              //   GIVE TRANSMITTER TIME TO TURN ON
    int lenOfMessage = MyMessage.length();
    for (int p = 0; p < lenOfMessage; p++) {  //  step thru the message one char at a time
      DecodeSend_DitDahsFor(char(MyMessage[p]));
      delay(LetterSpaceTime);
    }
    PTT(false);
  }
}

float Read_Battery1_Volt() {  // read battery dc voltage here x is the batter number <<<<<<<<<<<<<<<<<<<>>>>>>>>>>>>>>>>>>>>>>
  //  divider resistors are 2k and 1k   makes a div by 3  takes 15v down to 5v
  float DCVreading = 12.0;                        // make a temp holding place for reading
  int reading = analogRead(Battery1Volt_Pin);     // value will be  0 to 1023 =  0 to 15v
  DCVreading = reading * FS_Battery_volt / 1023;  // voltage divider set for 1023 = 15v FS
  return (DCVreading * Battery1_Volt_Cal);        // this value will be 0 to 15  -  the Cal factor is for fine tuning the reading
}

float Read_Battery2_Volt() {  // read battery dc voltage here x is the batter number <<<<<<<<<<<<<<<<<<<>>>>>>>>>>>>>>>>>>>>>>
  //  divider resistors are 2k and 1k   makes a div by 3  takes 15v down to 5v
  float DCVreading = 12.0;                        // make a temp holding place for reading
  int reading = analogRead(Battery2Volt_Pin);     // value will be  0 to 1023 =  0 to 15v
  DCVreading = reading * FS_Battery_volt / 1023;  // voltage divider set for 1023 = 15v FS
  return (DCVreading * Battery2_Volt_Cal);        // this value will be 0 to 15  -  the Cal factor is for fine tuning the reading
}

float Read_ACV_Volt() {
  //  code to read ac voltage here <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  //  use a 6v step down transformer   120vac to 6vac
  //  6 rms vac peak voltage is 1.414*vrms  8.5v p  DIODE DROP IS 0.7 SO VOLTAGE OUT FROM DIODE IS 7.8V
  //  divider resistors are 400 and 600  makes a 1.66 divider  takes 7.8v  down to 5v
  float ACVreading = 120.0;                      // temp place to put reading
  int reading = analogRead(ACV_Volt_Pin);        // value will be 0 - 1023  =  0 to 150v
  ACVreading = reading * FS_ACline_volt / 1023;  // voltage divider set for 1023 = 150v FS
  return (ACVreading * ACV_Line_Volt_Cal);       //  used to fine tune the reading
}

float Read_ACC_Current() {
  //  code to read ac current here <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  //  input from current transformer
  float reading = 10.0;                             // temp place to put reading
  int ACCreading = analogRead(ACC_Current_Pin);     // value will be 0 - 1023  =  0 to 150v
  ACCreading = reading * FS_ACline_Current / 1023;  // voltage divider set for 1023 = 150v FS
  return (ACCreading * ACC_Line_Amps_Cal);          //  used to fine tune the reading
}

bool CheckIntrusionSwitch() {        // code to read the state of the intrusion switch.  <<<<<<<<<<<<<<<<<<<>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  if (digitalRead(Intrusion_Pin)) {  //  can invert logic here if needed
    return true;
  } else {
    return false;
  }
}

bool Disable_Alarm_Reporting() {         //  this allows the R_Pi to tell the Arduino to shut-up
  if (digitalRead(Disable_Alarm_Pin)) {  //  can invert logic here if needed
    return true;
  } else {
    return false;
  }
}

void setup() {
  // Serial.begin(9600);     //             used for de-bug
  pinMode(LED_Pin, OUTPUT);
  pinMode(Speaker_Pin, OUTPUT);
  pinMode(PTT_Pin, OUTPUT);
  pinMode(Disable_Alarm_Pin, INPUT_PULLUP);
  pinMode(Intrusion_Pin, INPUT_PULLUP);
  pinMode(Battery1Volt_Pin, INPUT);
  pinMode(Battery2Volt_Pin, INPUT);
  pinMode(ACV_Volt_Pin, INPUT);
  test_message.toUpperCase();  //          just to make sure the string is upper case!!
}

void loop() {  //                                              work is done here!!
  float _Reading;
  _Reading = Read_Battery1_Volt();
  if (_Reading < Battery_Low_Limit) {
    Send_Message("B 1 L   B 1 L   B 1 L  ");
    Send_Message(Radio_ID);
  }
  if (_Reading > Battery_Hi_Limit) {
    Send_Message("B 1 H   B 1 H   B 1 H  ");
    Send_Message(Radio_ID);
  }
  _Reading = Read_Battery2_Volt();
  if (_Reading < Battery_Low_Limit) {
    Send_Message("B 2 L   B 2 L   B 2 L  ");
    Send_Message(Radio_ID);
  }
  if (_Reading > Battery_Hi_Limit) {
    Send_Message("B 2 H   B 2 H   B 2 H  ");
    Send_Message(Radio_ID);
  }

  if (CheckIntrusionSwitch()) {  // ~ once per second!!
    Send_Message("I N T   I N T   I N T   I N T  I N T   ");
    Send_Message(Radio_ID);
  }

  _Reading = Read_ACV_Volt();
  if (_Reading < ACV_Low_Limit) {
    Send_Message("AC V L   AC V L   AC V L  ");
    Send_Message(Radio_ID);
  }
  if (_Reading > ACV_Hi_Limit) {
    Send_Message("AC V H   AC V H   AC V H  ");
    Send_Message(Radio_ID);
  }
  _Reading = Read_ACC_Current();
  if (_Reading > ACC_Hi_Limit) {
    Send_Message("AC C H   AC C H    AC C H  ");
    Send_Message(Radio_ID);
  }
  delay(987);  //                                    slow the loop down to about 1 reading/sec
}






