export const animalNames = {
    "LAG": "토끼", "LAS": "햄스터", "LBG": "고양이", "LBS": "다람쥐",
    "VAG": "강아지", "VAS": "여우", "VBG": "펭귄", "VBS": "라쿤"
};

export const getAnimalNameWithPrefix = (matchType, growthStage) => {
    if (!matchType) return "알";
    if (growthStage?.toUpperCase() === "EGG") return "알";
    if (growthStage?.toUpperCase() === "MASTER") return "마스터";

    const baseName = animalNames[matchType] || "동물";
    const stage = growthStage?.toUpperCase();

    if (stage === "ADULT") return `멋진 ${baseName}`;
    if (stage === "CHILD" || stage === "BABY") return `귀여운 ${baseName}`;

    return baseName;
};
