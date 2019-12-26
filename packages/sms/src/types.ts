export enum EMethods {
  POST = 'POST',
  GET = 'GET'
}

export interface IEvent {
  httpMethod: keyof typeof EMethods,
  body: string,
}