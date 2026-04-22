import RowNavigation from "@/components/RowNavigation.jsx";
import CardPack from "@/components/CardPack.jsx";
import { CARD_PACKS } from "@/components/InfoCards.jsx";

const LINKS = [
  { path: "/", label: "Main Page", id: 1 },
  { label: "Packs Gallery", id: 2 },
];

const PacksGallery = () => {
  return (
    <main className="flex flex-col w-full p-5 gap-5">
      <RowNavigation links={LINKS}/>

      <div className='flex flex-col gap-8'>
        <div className='flex flex-col gap-4'>
          <h1 className='text-h1'>Packs Gallery</h1>
          <span className='text-label text-text-label font-noto'>Explore public packs or manage your own creations.</span>
        </div>

        <div className='w-full flex items-center justify-between gap-4'>
          <h1 className='text-h1'>Community</h1>
          <button
            className='text-label font-noto text-brand-500'
          >
            Browse all community packs →
          </button>
        </div>

        <ul className='flex flex-col gap-8 w-full'>
          {CARD_PACKS.map((pack) => (
            <CardPack key={pack.id} pack={pack}/>
          ))}
        </ul>

        <div className='w-full flex items-center justify-between gap-4'>
          <h1 className='text-h1'>Saved</h1>
          <button
            className='text-label font-noto text-brand-500'
          >
            Browse all saved packs →
          </button>
        </div>

        <ul className='flex flex-col gap-8 w-full'>
          {CARD_PACKS.map((pack) => (
            <CardPack key={pack.id} pack={pack}/>
          ))}
        </ul>

        <div className='w-full flex items-center justify-between gap-4'>
          <h1 className='text-h1'>My Creations</h1>
          <button
            className='text-label font-noto text-brand-500'
          >
            Browse all created packs →
          </button>
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

export default PacksGallery;
