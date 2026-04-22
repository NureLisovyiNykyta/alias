import RowNavigation from "@/components/RowNavigation.jsx";

const LINKS = [
  { path: "/", label: "Main Page", id: 1 },
  { label: "Packs Gallery", id: 2 },
];

const PacksGallery = () => {
  return (
    <main className="flex flex-col w-full p-5 gap-5">
      <RowNavigation links={LINKS}/>
    </main>
  );
};

export default PacksGallery;
