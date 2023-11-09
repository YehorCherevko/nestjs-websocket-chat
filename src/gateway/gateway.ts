import { OnModuleInit } from '@nestjs/common';
import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({})
export class MyGateway implements OnModuleInit {
  @WebSocketServer()
  server: Server;

  users: { id: string; nickname: string }[] = [];
  messages: {
    id: string;
    userId: string;
    nickname: string;
    content: string;
  }[] = [];

  onModuleInit() {
    this.server.on('connection', (socket: Socket) => {
      console.log(`User connected: ${socket.id}`);

      const connectedUsers = this.users.map((user) => user.nickname);

      socket.emit('ConnectedUsers', connectedUsers);

      this.users.push({
        id: socket.id,
        nickname: `User${this.users.length + 1}`,
      });

      this.server.emit('userConnected', {
        id: socket.id,
        nickname: this.users[this.users.length - 1].nickname,
      });

      this.server.emit(
        'updatedUserList',
        this.users.map((user) => user.nickname),
      );

      socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);

        const disconnectedUser = this.users.find(
          (user) => user.id === socket.id,
        );

        if (disconnectedUser) {
          this.users = this.users.filter((user) => user.id !== socket.id);

          this.server.emit('userDisconnected', {
            id: socket.id,
            nickname: disconnectedUser.nickname,
          });

          this.server.emit(
            'updatedUserList',
            this.users.map((user) => user.nickname),
          );
        }
      });
    });
  }

  @SubscribeMessage('newMessage')
  onNewMessage(
    @MessageBody() body: { message: string },
    @ConnectedSocket() socket: Socket,
  ) {
    console.log('Received new message:', body);

    const user = this.users.find((u) => u.id === socket.id);

    if (user) {
      const message = {
        id: this.generateMessageId(),
        userId: socket.id,
        nickname: user.nickname,
        content: body.message,
      };

      this.messages.push(message);

      this.server.emit('onMessage', message);
    }
  }

  @SubscribeMessage('editMessage')
  onEditMessage(
    @MessageBody() editedMessage: { id: string; newContent: string },
    @ConnectedSocket() socket: Socket,
  ) {
    console.log('Received edit message request:', editedMessage);

    const messageIndex = this.messages.findIndex(
      (msg) => msg.id === editedMessage.id,
    );

    if (
      messageIndex !== -1 &&
      this.messages[messageIndex].userId === socket.id
    ) {
      this.messages[messageIndex].content = editedMessage.newContent;

      this.server.emit('onMessageEdited', this.messages[messageIndex]);
    }
  }

  @SubscribeMessage('deleteMessage')
  onDeleteMessage(
    @MessageBody() messageId: string,
    @ConnectedSocket() socket: Socket,
  ) {
    console.log('Deleted Message:', messageId);

    const messageIndex = this.messages.findIndex((msg) => msg.id === messageId);

    if (
      messageIndex !== -1 &&
      this.messages[messageIndex].userId === socket.id
    ) {
      const deletedMessage = this.messages.splice(messageIndex, 1)[0];

      this.server.emit('onMessageDeleted', deletedMessage);
    }
  }

  private generateMessageId(): string {
    return Date.now().toString();
  }
}
