export async function loadOrganization() {
  const response = await fetch("/api/organization", { cache: "no-store" });
  if (!response.ok) throw new Error(`Unable to load BoatBoard organization data (${response.status}).`);
  const organization = await response.json();
  const colorPairs = [
    ["#e4bd5e", "#8f6424"], ["#f0d968", "#a48727"], ["#5c86b9", "#2b456f"],
    ["#78c8df", "#367c9d"], ["#df817d", "#944a50"], ["#7bc27a", "#3d7b48"],
    ["#60966a", "#2c5939"], ["#62b9ad", "#33766f"], ["#de9462", "#965334"],
    ["#a78ac8", "#654d8d"], ["#dc87ad", "#914e73"], ["#8299c9", "#465d8e"],
  ];
  organization.colleagues = organization.colleagues.map((person, index) => ({
    ...person,
    colors: colorPairs[index % colorPairs.length],
  }));
  return organization;
}
