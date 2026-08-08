// Demonstration-only data. Replace through the future private data-source adapter.
const teamMemberCounts = Array.from({ length: 99 }, (_, index) => index + 1);

const names = [
  "João", "Maria", "Ana", "Bruno", "Carla", "Daniel", "Elisa", "Felipe",
  "Gabriela", "Henrique", "Isabela", "Lucas", "Marina", "Nina", "Otávio",
  "Paula", "Rafael", "Sofia", "Thiago", "Vitória", "André", "Beatriz",
  "Caio", "Débora", "Eduardo", "Fernanda", "Gustavo", "Helena", "Igor",
  "Júlia", "Leandro", "Mônica", "Natália", "Pedro", "Renata", "Samuel",
];

const colorPairs = [
  ["#e4bd5e", "#8f6424"], ["#f0d968", "#a48727"],
  ["#5c86b9", "#2b456f"], ["#78c8df", "#367c9d"],
  ["#df817d", "#944a50"], ["#7bc27a", "#3d7b48"],
  ["#60966a", "#2c5939"], ["#62b9ad", "#33766f"],
  ["#de9462", "#965334"], ["#a78ac8", "#654d8d"],
  ["#dc87ad", "#914e73"], ["#8299c9", "#465d8e"],
];

const teams = teamMemberCounts.map((_, index) => ({
  id: `team-${index + 1}`,
  name: `Team ${String(index + 1).padStart(2, "0")}`,
}));

let colleagueIndex = 0;
const colleagues = teams.flatMap((team, teamIndex) =>
  Array.from({ length: teamMemberCounts[teamIndex] }, (_, memberIndex) => {
    const currentIndex = colleagueIndex++;
    const name = names[currentIndex % names.length];
    return {
      id: `${team.id}-person-${memberIndex + 1}`,
      name,
      teamId: team.id,
      colors: colorPairs[currentIndex % colorPairs.length],
    };
  }),
);

export const organization = { teams, colleagues };
