import { TEAM_BG_MAP_DARK } from "@/constants/teamColors.js";
import { parseUpperCase } from "@/utils/parseUpperCase.js";

export default function TeamsDashboard({ team, explainer }) {
  if (!team || !explainer) return null;

  const teamColor = TEAM_BG_MAP_DARK[team.color];
  const teamNameDisplay = parseUpperCase(team.color);

  return (
    <div className="fixed top-6 left-6 w-[350px] grid grid-cols-2 z-[100] gap-3">
      <div className="bg-white p-4 col-span-2 rounded-[12px] flex items-center justify-between">
        <div className='flex items-center gap-4 h-full'>
          <div
            className='h-full w-2 shadow-lobby-modal rounded-xs'
            style={{ backgroundColor: teamColor }}
          />

          <div className='flex flex-col gap-0.5'>
            <p className='font-noto'>Team's move</p>
            <span
              className='text-btn font-noto'
              style={{ color: teamColor }}
            >
              {teamNameDisplay}
            </span>
          </div>
        </div>

        <div className='flex items-center gap-4 mr-8'>
          <img
            src={explainer.avatar_url}
            alt='Explainer Avatar'
            className='object-center size-12 shadow-lobby-modal rounded-full'
          />
          <div className='flex flex-col gap-0.5'>
            <p className='font-noto'>Explainer</p>
            <span
              className='text-btn font-noto'
              style={{ color: teamColor }}
            >
              {explainer.nickname}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
