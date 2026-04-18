import SvgIcon from '@mui/material/SvgIcon';

export default function SitemarkIcon() {
  return (
    <SvgIcon sx={{ height: 56, width: 56, mr: 2 }}>
      <image
        href="/logo.svg"
        x="0"
        y="0"
        height="56"
        width="56"
        preserveAspectRatio="xMidYMid meet"
      />
    </SvgIcon>
  );
}
