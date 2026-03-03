import socket

HOST = "0.0.0.0"
PORT = 6969

STX = 0x02
ETX = 0x03

def extract_tags(buf: bytearray):
    tags = []
    while True:
        try:
            i = buf.index(STX)
        except ValueError:
            # no STX left; drop junk
            buf.clear()
            break

        # drop anything before STX
        if i > 0:
            del buf[:i]

        try:
            j = buf.index(ETX, 1)
        except ValueError:
            # wait for more data
            break

        payload = bytes(buf[1:j])
        del buf[:j+1]

        # strip CR/LF and spaces
        payload = payload.strip(b"\r\n \t")
        if payload:
            try:
                tags.append(payload.decode("ascii", errors="ignore"))
            except Exception:
                pass
    return tags

def main():
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind((HOST, PORT))
    s.listen(5)
    print(f"Listening on {HOST}:{PORT}")

    while True:
        conn, addr = s.accept()
        print(f"Connected: {addr[0]}:{addr[1]}")
        buf = bytearray()
        try:
            while True:
                data = conn.recv(4096)
                if not data:
                    break
                buf.extend(data)
                for tag in extract_tags(buf):
                    print(tag)
                    print('--break--')
        finally:
            try:
                conn.close()
            except:
                pass
            print("Disconnected")

if __name__ == "__main__":
    main()