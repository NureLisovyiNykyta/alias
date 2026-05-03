import RowNavigation from "@/components/RowNavigation.jsx";
import CardPack from "@/components/CardPack.jsx";
import { CARD_PACKS } from "@/components/InfoCards.jsx";
import { Link } from "react-router-dom";

const LINKS = [
  { path: "/", label: "Main Page", id: 1 },
  { label: "Packs Gallery", id: 2 },
];

const PACKS_LINKS = [
  { path: "/packs/community" },
  { path: "/packs/saved" },
  { path: "/packs/created" },
];

const PacksGallery = () => {
  return (
    <main className="flex flex-col w-full gap-5">
      <RowNavigation links={LINKS}/>

      <div className='flex flex-col gap-8'>
        <div className='flex flex-col gap-4'>
          <h1 className='text-h1'>Packs Gallery</h1>
          <span className='text-label text-text-label font-noto'>Explore public packs or manage your own creations.</span>
        </div>

        <div className='w-full flex items-center justify-between gap-4'>
          <h1 className='text-h1'>Community</h1>
          <Link
            to={PACKS_LINKS[0].path}
            className='text-label font-noto text-brand-500'
          >
            Browse all community packs →
          </Link>
        </div>

        <ul className='flex flex-col gap-8 w-full'>
          {CARD_PACKS.map((pack) => (
            <CardPack key={pack.id} pack={pack}/>
          ))}
        </ul>

        <div className='w-full flex items-center justify-between gap-4'>
          <h1 className='text-h1'>Saved</h1>
          <Link
            to={PACKS_LINKS[1].path}
            className='text-label font-noto text-brand-500'
          >
            Browse all saved packs →
          </Link>
        </div>

        <ul className='flex flex-col gap-8 w-full'>
          {CARD_PACKS.map((pack) => (
            <CardPack key={pack.id} pack={pack}/>
          ))}
        </ul>

        <div className='w-full flex items-center justify-between gap-4'>
          <h1 className='text-h1'>My Creations</h1>
          <Link
            to={PACKS_LINKS[2].path}
            className='text-label font-noto text-brand-500'
          >
            Browse all created packs →
          </Link>
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
