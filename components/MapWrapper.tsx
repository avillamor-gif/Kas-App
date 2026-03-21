import "leaflet/dist/leaflet.css";
import dynamic from "next/dynamic";
import type { MemberLocation } from "./LiveMap";

const LiveMapInner = dynamic(() => import("./LiveMap"), { ssr: false });

type Props = {
  members: MemberLocation[];
  selectedId: string | null;
  historyPoints: { lat: number; lng: number }[];
};

export default function MapWrapper(props: Props) {
  return <LiveMapInner {...props} />;
}
