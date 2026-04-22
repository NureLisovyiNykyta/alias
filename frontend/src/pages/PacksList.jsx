import RowNavigation from "@/components/RowNavigation.jsx";
import CardPack from "@/components/CardPack.jsx";
import { CARD_PACKS } from "@/components/InfoCards.jsx";
import { useParams } from "react-router-dom";

const PacksList = () => {
  const { type } = useParams();

  const parseLabel = type => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const links = [
    { path: "/", label: "Main Page", id: 1 },
    { path: "/gallery", label: "Packs Gallery", id: 2 },
    { label: parseLabel(type), id: 3 },
  ];

  return (
    <main className="flex flex-col w-full p-5 gap-5">
      <RowNavigation links={links}/>

      <div className='flex flex-col gap-8'>
        <div className='w-full flex items-center justify-between gap-4'>
          <h1 className='text-h1'>{parseLabel(type)}</h1>
        </div>

        <ul className='flex flex-col gap-8 w-full'>
          {CARD_PACKS.map((pack) => (
            <CardPack key={pack.id} pack={pack}/>
          ))}
        </ul>
      </div>
    </main>
  );
};

export default PacksList;
