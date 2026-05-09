import { ColyseusTransport } from "./ColyseusTransport";

export class NetworkLayer {
    static readonly colyseus = ColyseusTransport.getInstance();
    // ProfileApiClient will be added here when the profile server is introduced
}

export { ColyseusTransport };
