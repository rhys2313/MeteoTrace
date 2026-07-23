import { Product, ProductId } from "@/types";

export const PRODUCTS: Product[] = [
  { id: "geocolour", name: "GEOCOLOR", shortName: "RGB композит", description: "Цветной композит облачности, суши и моря для общего обзора сцены.", interpretation: "Помогает различать структуру облаков и подстилающую поверхность.", limitations: "Внешний вид зависит от освещения и алгоритма композиции.", units: "—", kind: "derived", legend: ["тёмное — поверхность", "светлое — облачность"] },
  { id: "ir105", name: "IR 10.5", shortName: "инфракрасный канал", description: "Наблюдение теплового излучения в окне около 10.5 μm.", interpretation: "Холодные и высокие облачные вершины обычно отображаются светлее.", limitations: "Это не прямое измерение высоты и не прогноз.", units: "K / °C", kind: "measurement", legend: ["тёмное — теплее", "светлое — холоднее"] },
  { id: "cloudHeight", name: "CLOUD TOP HEIGHT", shortName: "высота верхней границы", description: "Расчётная оценка высоты верхней границы облаков.", interpretation: "Полезна для сопоставления вертикальной структуры облачности.", limitations: "Алгоритмический продукт с неопределённостью.", units: "км", kind: "derived", legend: ["ниже", "выше"] },
  { id: "cloudTemperature", name: "CLOUD TOP TEMPERATURE", shortName: "температура верхней границы", description: "Оценка температуры верхней границы облаков.", interpretation: "Более низкая температура часто соответствует более высоким облакам.", limitations: "Связь с высотой зависит от атмосферы и типа облаков.", units: "°C", kind: "derived", legend: ["теплее", "холоднее"] },
  { id: "cloudType", name: "CLOUD TYPE", shortName: "тип облаков", description: "Классификационный продукт типов облаков.", interpretation: "Подсказка для визуального анализа облачной сцены.", limitations: "Классификация может быть неоднозначной.", units: "класс", kind: "derived", legend: ["низкие", "средние", "высокие"] },
  { id: "lightning", name: "LIGHTNING", shortName: "молниевая активность", description: "Наблюдения зарегистрированной молниевой активности.", interpretation: "Показывает точки или области зарегистрированных разрядов.", limitations: "Не заменяет официальные предупреждения.", units: "события", kind: "measurement", legend: ["нет событий", "зарегистрированы"] },
];

export const productById = (id: ProductId) => PRODUCTS.find((product) => product.id === id) ?? PRODUCTS[0];
