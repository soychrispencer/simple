# Catalog audit (automático)

## 1) Tipos legacy (debería ser 0 filas)
- OK: no se encontraron slugs legacy.

## 2) Cobertura por tipo
| vehicle_type_slug | vehicle_type_name | models_count | distinct_brands_count |
| --- | --- | --- | --- |
| auto | Auto | 448 | 59 |
| camion | Camión | 84 | 28 |
| moto | Moto | 62 | 22 |
| nautico | Náutico | 52 | 35 |
| aereo | Aéreo | 43 | 25 |
| bus | Bus | 38 | 15 |
| maquinaria | Maquinaria | 36 | 17 |

## 3) Tipos con 0 modelos (debería ser 0 filas)
- OK: todos los tipos tienen al menos 1 modelo.

## 4) Top 30 marcas por tipo (por cantidad de modelos)

### aereo
| brand_name | models_count |
| --- | --- |
| Boeing | 6 |
| Airbus | 5 |
| Embraer | 4 |
| Bombardier | 3 |
| Cessna | 3 |
| Airbus Helicopters | 2 |
| DJI | 2 |
| Antonov | 1 |
| ATR | 1 |
| Autel Robotics | 1 |
| Beechcraft | 1 |
| Bell Helicopter | 1 |
| Cirrus | 1 |
| Dassault | 1 |
| Diamond Aircraft | 1 |
| Gulfstream | 1 |
| Leonardo Helicopters | 1 |
| Parrot | 1 |
| Pilatus | 1 |
| Piper | 1 |
| Robinson Helicopter | 1 |
| Sikorsky | 1 |
| Skydio | 1 |
| Sukhoi | 1 |
| Tecnam | 1 |

### auto
| brand_name | models_count |
| --- | --- |
| Chevrolet | 19 |
| Hyundai | 19 |
| Toyota | 19 |
| Volkswagen | 18 |
| Renault | 17 |
| Kia | 16 |
| Ford | 15 |
| Fiat | 14 |
| Nissan | 14 |
| Honda | 13 |
| Peugeot | 13 |
| JAC | 12 |
| Suzuki | 12 |
| Chery | 10 |
| MG | 10 |
| Changan | 9 |
| Subaru | 9 |
| Jeep | 8 |
| Maxus | 8 |
| Mitsubishi | 8 |
| BYD | 7 |
| Citroën | 7 |
| Geely | 7 |
| Great Wall | 7 |
| Land Rover | 7 |
| Mazda | 7 |
| Ram | 7 |
| Mercedes-Benz Vans | 6 |
| SEAT | 6 |
| Skoda | 6 |

### bus
| brand_name | models_count |
| --- | --- |
| King Long | 5 |
| Marcopolo | 5 |
| Mercedes-Benz Buses | 5 |
| Volvo Buses | 5 |
| Yutong | 5 |
| Alexander Dennis | 2 |
| Irizar | 2 |
| Iveco Bus | 2 |
| Agrale | 1 |
| Caio | 1 |
| MAN Bus | 1 |
| Neobus | 1 |
| Scania Buses | 1 |
| Setra | 1 |
| VDL | 1 |

### camion
| brand_name | models_count |
| --- | --- |
| DAF | 5 |
| Freightliner | 5 |
| International | 5 |
| Iveco | 5 |
| Kenworth | 5 |
| Mack | 5 |
| MAN | 5 |
| Mercedes-Benz Trucks | 5 |
| Peterbilt | 5 |
| Renault Trucks | 5 |
| Scania | 5 |
| Volvo Trucks | 5 |
| Western Star | 5 |
| Dongfeng | 2 |
| Foton | 2 |
| Mitsubishi Fuso | 2 |
| Volkswagen | 2 |
| Ashok Leyland | 1 |
| FAW | 1 |
| Hino | 1 |
| Hyundai | 1 |
| Isuzu | 1 |
| JMC | 1 |
| Shacman | 1 |
| Sinotruk | 1 |
| Tata Motors | 1 |
| UD Trucks | 1 |
| Volvo | 1 |

### maquinaria
| brand_name | models_count |
| --- | --- |
| Caterpillar | 5 |
| John Deere | 5 |
| Komatsu | 5 |
| Bobcat | 2 |
| Case IH | 2 |
| Hitachi Construction Machinery | 2 |
| JCB | 2 |
| Kubota | 2 |
| New Holland | 2 |
| Volvo Construction Equipment | 2 |
| Doosan | 1 |
| Genie | 1 |
| JLG | 1 |
| Liebherr | 1 |
| SANY | 1 |
| Terex | 1 |
| XCMG | 1 |

### moto
| brand_name | models_count |
| --- | --- |
| Benelli | 5 |
| CFMoto | 5 |
| Harley-Davidson | 5 |
| Honda Motorcycle | 5 |
| Kawasaki | 5 |
| Suzuki Motorcycle | 5 |
| Yamaha | 5 |
| BMW Motorrad | 3 |
| Ducati | 3 |
| KTM | 3 |
| Triumph | 3 |
| Aprilia | 2 |
| Bajaj Auto | 2 |
| Husqvarna Motorcycles | 2 |
| Vespa | 2 |
| Hero MotoCorp | 1 |
| Indian Motorcycle | 1 |
| Moto Guzzi | 1 |
| Piaggio | 1 |
| Royal Enfield | 1 |
| TVS Motor | 1 |
| Zero Motorcycles | 1 |

### nautico
| brand_name | models_count |
| --- | --- |
| Sea-Doo | 5 |
| Yamaha Marine | 4 |
| Beneteau | 3 |
| Jeanneau | 3 |
| Mercury Marine | 3 |
| Azimut | 2 |
| Kawasaki Jet Ski | 2 |
| Sea Ray | 2 |
| Zodiac | 2 |
| AB Inflatables | 1 |
| Alumacraft | 1 |
| Bavaria | 1 |
| Bayliner | 1 |
| Boston Whaler | 1 |
| Brig | 1 |
| Catalina Yachts | 1 |
| Chaparral | 1 |
| Chris-Craft | 1 |
| Evinrude | 1 |
| Ferretti | 1 |
| Grady-White | 1 |
| Hanse | 1 |
| Honda Marine | 1 |
| Lagoon | 1 |
| Lund | 1 |
| MasterCraft | 1 |
| Nautique | 1 |
| Princess Yachts | 1 |
| Quicksilver | 1 |
| Ranger Boats | 1 |

## 5) Duplicados potenciales (brand + modelo dentro del tipo)
- OK: no se detectaron duplicados.
