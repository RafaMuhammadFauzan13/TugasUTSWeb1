/* ===== Helper umum ===== */
const $ = (s, r = document) => r.querySelector(s);
const angka = (v) => (typeof v === "number" ? v : Number(String(v).replace(/\D/g, "")) || 0); // "Rp 180.000" -> 180000
const rupiah = (n) => "Rp " + Number(n).toLocaleString("id-ID");
const simpan = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const ambil = (k, def) => {
  try { const v = JSON.parse(localStorage.getItem(k)); return v ?? def; } catch { return def; }
};
// Data awal dari data.js, perubahan pengguna disimpan di localStorage
const getKatalog = () => ambil("lentera_katalog", dataKatalogBuku.map((b) => ({ ...b })));
const getPengguna = () => dataPengguna.concat(ambil("lentera_pengguna", []));
const getTracking = () => ambil("lentera_tracking", []).concat(Object.values(dataTracking));

function el(tag, teks, kelas) {
  const e = document.createElement(tag);
  if (teks !== undefined) e.textContent = teks;
  if (kelas) e.className = kelas;
  return e;
}

/* Pop-up / alert box */
function notify(judul, pesan, tipe) {
  const m = el("div", undefined, "modal terbuka");
  m.dataset.dinamis = "1";
  m.setAttribute("role", "alertdialog");
  m.setAttribute("aria-modal", "true");
  const box = el("div", undefined, "modal-box " + (tipe || ""));
  const aksi = el("div", undefined, "aksi");
  const tombol = el("button", "Mengerti", "btn");
  tombol.dataset.tutup = "1";
  aksi.append(tombol);
  box.append(el("h2", judul), el("p", pesan), aksi);
  m.append(box);
  document.body.append(m);
  tombol.focus();
}
const buka = (id) => $("#" + id).classList.add("terbuka");
function tutupModal(m) {
  if (!m) return;
  if (m.dataset.dinamis) m.remove(); else m.classList.remove("terbuka");
}
document.addEventListener("click", (e) => {
  const modal = e.target.closest(".modal");
  if (e.target.closest("[data-tutup]") || e.target === modal) tutupModal(modal);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") document.querySelectorAll(".modal.terbuka").forEach(tutupModal);
});

/* Validasi: pesan tampil di span.galat setelah input */
function galat(input, pesan) {
  const span = input.nextElementSibling;
  if (span && span.classList.contains("galat")) span.textContent = pesan || "";
  input.classList.toggle("salah", !!pesan);
  return !pesan;
}
const emailValid = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

/* ===== Proteksi halaman & logout ===== */
const halaman = document.body.dataset.halaman;
const user = JSON.parse(sessionStorage.getItem("user") || "null");
if (halaman !== "login" && !user) location.replace("index.html");
const btnLogout = $("#btnLogout");
if (btnLogout) btnLogout.addEventListener("click", () => {
  sessionStorage.removeItem("user");
  location.href = "index.html";
});

/* ===== Login ===== */
function initLogin() {
  $("#formLogin").addEventListener("submit", (e) => {
    e.preventDefault();
    const email = $("#email"), pass = $("#password");
    const okE = galat(email, !email.value.trim() ? "Email wajib diisi." : !emailValid(email.value.trim()) ? "Format email tidak valid." : "");
    const okP = galat(pass, !pass.value ? "Password wajib diisi." : "");
    if (!okE || !okP) return;
    const akun = getPengguna().find((u) => u.email === email.value.trim().toLowerCase() && u.password === pass.value);
    if (!akun) return notify("Login gagal", "Email/password yang anda masukkan salah.", "error");
    sessionStorage.setItem("user", JSON.stringify({ nama: akun.nama, email: akun.email, role: akun.role }));
    location.href = "dashboard.html";
  });

  $("#btnLupa").addEventListener("click", () => buka("modalLupa"));
  $("#btnDaftar").addEventListener("click", () => buka("modalDaftar"));

  $("#formLupa").addEventListener("submit", (e) => {
    e.preventDefault();
    const inp = $("#emailLupa"), v = inp.value.trim().toLowerCase();
    if (!galat(inp, !emailValid(v) ? "Masukkan email yang valid." : "")) return;
    tutupModal($("#modalLupa"));
    if (getPengguna().some((u) => u.email === v)) notify("Tautan terkirim", "Tautan reset password dikirim ke " + v + ".");
    else notify("Email tidak ditemukan", "Email itu belum terdaftar. Silakan daftar dulu.", "error");
    inp.value = "";
  });

  $("#formDaftar").addEventListener("submit", (e) => {
    e.preventDefault();
    const [nama, email, pass] = [$("#dNama"), $("#dEmail"), $("#dPass")];
    const ev = email.value.trim().toLowerCase();
    const r = [
      galat(nama, nama.value.trim().length < 3 ? "Nama minimal 3 karakter." : ""),
      galat(email, !emailValid(ev) ? "Format email tidak valid." : getPengguna().some((u) => u.email === ev) ? "Email sudah terdaftar." : ""),
      galat(pass, pass.value.length < 6 ? "Password minimal 6 karakter." : "")
    ];
    if (r.includes(false)) return;
    const baru = ambil("lentera_pengguna", []);
    baru.push({ id: dataPengguna.length + baru.length + 1, nama: nama.value.trim(), email: ev, password: pass.value, role: "User" });
    simpan("lentera_pengguna", baru);
    e.target.reset();
    tutupModal($("#modalDaftar"));
    notify("Pendaftaran berhasil", "Akun dibuat. Silakan login dengan email " + ev + ".");
  });
}

/* ===== Dashboard ===== */
function initDashboard() {
  const jam = new Date().getHours();
  const waktu = jam < 11 ? "pagi" : jam < 15 ? "siang" : jam < 18 ? "sore" : "malam";
  $("#salam").textContent = "Selamat " + waktu + ", " + user.nama + ".";
  $("#tanggal").textContent = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) + ". Masuk sebagai " + user.role + ".";
}

/* ===== Stok / Katalog ===== */
function cover(b) {
  const img = el("img", undefined, "sampul");
  img.src = b.cover; img.alt = "Cover " + b.namaBarang;
  img.onerror = () => img.replaceWith(el("span", b.namaBarang.charAt(0), "sampul"));
  return img;
}
function barisStok(b) {
  const tr = el("tr");
  const c0 = el("td"); c0.append(cover(b));
  const kelas = b.stok === 0 ? " habis" : b.stok < 100 ? " rendah" : "";
  const cs = el("td"); cs.append(el("span", String(b.stok), "lencana" + kelas));
  const hapus = el("button", "Hapus", "btn kecil bahaya");
  hapus.addEventListener("click", () => {
    if (!confirm("Hapus " + b.namaBarang + " dari katalog?")) return;
    simpan("lentera_katalog", getKatalog().filter((x) => x.kodeBarang !== b.kodeBarang));
    tr.remove();
  });
  const ca = el("td"); ca.append(hapus);
  tr.append(c0, el("td", b.kodeBarang), el("td", b.namaBarang), el("td", b.jenisBarang), el("td", b.edisi), el("td", b.harga, "angka"), cs, ca);
  return tr;
}
function initStok() {
  const tb = $("#tbStok");
  const tampil = () => {
    const q = $("#cari").value.trim().toLowerCase();
    tb.replaceChildren();
    const data = getKatalog().filter((b) => (b.kodeBarang + b.namaBarang + b.jenisBarang).toLowerCase().includes(q));
    if (!data.length) { const td = el("td", "Tidak ada buku yang cocok.", "kosong"); td.colSpan = 8; const tr = el("tr"); tr.append(td); tb.append(tr); return; }
    data.forEach((b) => tb.append(barisStok(b)));
  };
  tampil();
  $("#cari").addEventListener("input", tampil);

  $("#formStok").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = Object.fromEntries(["kodeBarang", "namaBarang", "jenisBarang", "edisi", "harga", "stok"].map((i) => [i, $("#" + i)]));
    const katalog = getKatalog();
    const kode = f.kodeBarang.value.trim().toUpperCase();
    const r = [
      galat(f.kodeBarang, !kode ? "Kode wajib diisi." : katalog.some((b) => b.kodeBarang === kode) ? "Kode sudah dipakai." : ""),
      galat(f.namaBarang, !f.namaBarang.value.trim() ? "Nama barang wajib diisi." : ""),
      galat(f.jenisBarang, !f.jenisBarang.value.trim() ? "Jenis barang wajib diisi." : ""),
      galat(f.edisi, !(Number(f.edisi.value) >= 1) ? "Edisi minimal 1." : ""),
      galat(f.harga, !(Number(f.harga.value) > 0) ? "Harga harus lebih dari 0." : ""),
      galat(f.stok, f.stok.value === "" || Number(f.stok.value) < 0 ? "Stok minimal 0." : "")
    ];
    if (r.includes(false)) return notify("Data belum lengkap", "Periksa kolom yang ditandai merah.", "error");
    const baru = { kodeBarang: kode, namaBarang: f.namaBarang.value.trim(), jenisBarang: f.jenisBarang.value.trim(), edisi: String(Number(f.edisi.value)), stok: Number(f.stok.value), harga: rupiah(f.harga.value), cover: "img/" + kode.toLowerCase() + ".jpg" };
    katalog.push(baru);
    simpan("lentera_katalog", katalog);
    if (tb.querySelector(".kosong") || $("#cari").value) tampil(); else tb.append(barisStok(baru)); // tambah baris via DOM
    e.target.reset(); $("#jenisBarang").value = "Buku Ajar"; $("#edisi").value = 1;
    notify("Stok ditambahkan", baru.namaBarang + " masuk ke katalog.");
  });
}

/* ===== Checkout / Pemesanan ===== */
function initCheckout() {
  const getKeranjang = () => ambil("lentera_keranjang", []);
  const tb = $("#tbKeranjang"), pilih = $("#pilihBuku");
  $("#nama").value = user.nama;

  const isiPilihan = () => {
    pilih.replaceChildren();
    getKatalog().forEach((b) => {
      const o = el("option", b.namaBarang + " - " + b.harga + (b.stok === 0 ? " (habis)" : ""));
      o.value = b.kodeBarang; o.disabled = b.stok === 0;
      pilih.append(o);
    });
  };
  isiPilihan();

  const ongkir = () => Number($("#ekspedisi").selectedOptions[0].dataset.ongkir || 0);
  function tampil() {
    const kr = getKeranjang(), kat = getKatalog();
    tb.replaceChildren();
    let sub = 0;
    if (!kr.length) { const tr = el("tr"), td = el("td", "Belum ada buku di pesanan. Pilih buku lalu klik Tambah.", "kosong"); td.colSpan = 5; tr.append(td); tb.append(tr); }
    kr.forEach((item) => {
      const b = kat.find((x) => x.kodeBarang === item.kode);
      if (!b) return;
      const harga = angka(b.harga);
      sub += harga * item.jumlah;
      const tr = el("tr");
      const qty = el("input"); qty.type = "number"; qty.min = 1; qty.max = b.stok; qty.value = item.jumlah;
      qty.setAttribute("aria-label", "Jumlah " + b.namaBarang);
      qty.addEventListener("change", () => {
        const n = Math.floor(Number(qty.value));
        if (!(n >= 1) || n > b.stok) { notify("Jumlah tidak valid", "Jumlah harus 1 sampai " + b.stok + " (stok tersedia).", "error"); qty.value = item.jumlah; return; }
        item.jumlah = n; simpan("lentera_keranjang", kr); tampil();
      });
      const hapus = el("button", "Hapus", "btn kecil bahaya");
      hapus.addEventListener("click", () => { simpan("lentera_keranjang", kr.filter((x) => x !== item)); tampil(); });
      const cq = el("td"); cq.append(qty);
      const ca = el("td"); ca.append(hapus);
      tr.append(el("td", b.namaBarang), el("td", b.harga, "angka"), cq, el("td", rupiah(harga * item.jumlah), "angka"), ca);
      tb.append(tr);
    });
    $("#subtotal").textContent = rupiah(sub);
    $("#ongkir").textContent = rupiah(sub ? ongkir() : 0);
    $("#total").textContent = rupiah(sub ? sub + ongkir() : 0);
  }
  tampil();
  $("#ekspedisi").addEventListener("change", tampil);

  $("#btnTambah").addEventListener("click", () => {
    const b = getKatalog().find((x) => x.kodeBarang === pilih.value);
    const n = Math.floor(Number($("#jumlah").value));
    if (!b) return notify("Pilih buku", "Pilih satu buku dulu.", "error");
    if (!(n >= 1)) return notify("Jumlah tidak valid", "Jumlah minimal 1.", "error");
    const kr = getKeranjang();
    const ada = kr.find((x) => x.kode === b.kodeBarang);
    const total = (ada ? ada.jumlah : 0) + n;
    if (total > b.stok) return notify("Stok tidak cukup", "Stok " + b.namaBarang + " tinggal " + b.stok + ".", "error");
    if (ada) ada.jumlah = total; else kr.push({ kode: b.kodeBarang, jumlah: n });
    simpan("lentera_keranjang", kr); tampil();
  });

  $("#formPesan").addEventListener("submit", (e) => {
    e.preventDefault();
    const [nama, tel, alamat, eks, metode] = ["nama", "telepon", "alamat", "ekspedisi", "metode"].map((i) => $("#" + i));
    const r = [
      galat(nama, nama.value.trim().length < 3 ? "Nama minimal 3 karakter." : ""),
      galat(tel, !/^08\d{8,11}$/.test(tel.value.trim()) ? "Nomor harus diawali 08 dan 10-13 digit." : ""),
      galat(alamat, alamat.value.trim().length < 10 ? "Alamat minimal 10 karakter." : ""),
      galat(eks, !eks.value ? "Pilih ekspedisi." : ""),
      galat(metode, !metode.value ? "Pilih metode pembayaran." : "")
    ];
    if (r.includes(false)) return notify("Form belum benar", "Periksa kolom yang ditandai merah.", "error");
    const kr = getKeranjang();
    if (!kr.length) return notify("Pesanan kosong", "Tambahkan minimal satu buku.", "error");

    const kat = getKatalog();
    let sub = 0;
    const ringkas = [];
    for (const item of kr) {
      const b = kat.find((x) => x.kodeBarang === item.kode);
      if (!b || item.jumlah > b.stok) return notify("Stok berubah", "Stok salah satu buku tidak cukup. Ubah jumlahnya.", "error");
      sub += angka(b.harga) * item.jumlah;
      ringkas.push(b.namaBarang + " x" + item.jumlah);
    }
    kr.forEach((item) => { kat.find((x) => x.kodeBarang === item.kode).stok -= item.jumlah; });
    simpan("lentera_katalog", kat);

    const semua = getTracking().map((t) => t.nomorDO);
    let noDO;
    do { noDO = "2026" + String(Math.floor(1000 + Math.random() * 9000)); } while (semua.includes(noDO));
    const sekarang = new Date();
    const tgl = sekarang.toISOString().slice(0, 10);
    const waktu = tgl + " " + sekarang.toTimeString().slice(0, 8);
    simpan("lentera_tracking", [{
      nomorDO: noDO, nama: nama.value.trim(), status: "Diproses", ekspedisi: eks.value, tanggalKirim: tgl,
      paket: $("#paket").value, total: rupiah(sub + ongkir()),
      perjalanan: [{ waktu, keterangan: "Pesanan diterima (" + ringkas.join(", ") + "). Pembayaran: " + metode.value }]
    }, ...ambil("lentera_tracking", [])]);
    simpan("lentera_keranjang", []);
    e.target.reset(); $("#nama").value = user.nama;
    isiPilihan(); tampil();
    notify("Pesanan berhasil", "Nomor Delivery Order: " + noDO + ". Simpan nomor ini untuk melacak pengiriman.");
  });
}

/* ===== Tracking ===== */
function persenStatus(d) {
  const akhir = d.perjalanan && d.perjalanan.length ? d.perjalanan[d.perjalanan.length - 1].keterangan : "";
  if (/^selesai/i.test(akhir) || /selesai|terkirim|diterima/i.test(d.status)) return 100;
  const peta = { "diproses": 15, "dikirim": 50, "dalam perjalanan": 75 };
  return peta[d.status.toLowerCase()] ?? 25;
}
const TAHAP = ["Diproses", "Dikemas", "Dalam pengiriman", "Diterima"];
function indeksTahap(d) {
  const akhir = d.perjalanan.length ? d.perjalanan[d.perjalanan.length - 1].keterangan : "";
  if (/^selesai/i.test(akhir) || /selesai|terkirim|diterima/i.test(d.status)) return 3;
  const s = d.status.toLowerCase();
  if (s === "dikemas") return 1;
  if (s === "dikirim" || s === "dalam perjalanan") return 2;
  return 0;
}
function initTracking() {
  const cari = (no) => {
    const inp = $("#noDO"), v = no.trim();
    if (!galat(inp, !v ? "Nomor DO wajib diisi." : !/^\d+$/.test(v) ? "Nomor DO hanya berisi angka." : "")) { $("#hasil").hidden = true; return; }
    const d = getTracking().find((x) => x.nomorDO === v);
    if (!d) { $("#hasil").hidden = true; return notify("Pesanan tidak ditemukan", "Tidak ada pesanan dengan nomor " + v + ". Coba 20230012.", "error"); }
    document.querySelectorAll("[data-f]").forEach((n) => { n.textContent = d[n.dataset.f]; });
    const p = persenStatus(d);
    $("#isiBar").style.width = p + "%";
    $("#isiBar").parentElement.setAttribute("aria-valuenow", p);
    const lb = $("#lencanaStatus"); lb.textContent = d.status; lb.className = "lencana" + (p < 100 ? " rendah" : "");
    const idx = indeksTahap(d);
    const langkah = $("#langkah"); langkah.replaceChildren();
    TAHAP.forEach((t, i) => langkah.append(el("li", t, i < idx || idx === 3 ? "selesai" : i === idx ? "aktif" : "")));
    const ol = $("#perjalanan"); ol.replaceChildren();
    d.perjalanan.forEach((s, i) => {
      const li = el("li", undefined, i === d.perjalanan.length - 1 ? "aktif" : "");
      li.append(el("strong", s.keterangan), el("small", s.waktu));
      ol.append(li);
    });
    $("#hasil").hidden = false;
  };
  $("#formTrack").addEventListener("submit", (e) => { e.preventDefault(); cari($("#noDO").value); });
  const q = new URLSearchParams(location.search).get("do");
  if (q) { $("#noDO").value = q; cari(q); }
}

/* ===== Riwayat ===== */
function initRiwayat() {
  const data = getTracking().sort((a, b) => b.tanggalKirim.localeCompare(a.tanggalKirim)), tb = $("#tbRiwayat");
  data.forEach((t) => {
    const tr = el("tr"), tdDO = el("td"), a = el("a", t.nomorDO);
    a.href = "tracking.html?do=" + encodeURIComponent(t.nomorDO);
    tdDO.append(a);
    tr.append(tdDO, el("td", t.tanggalKirim), el("td", t.nama), el("td", t.ekspedisi), el("td", t.total, "angka"), el("td", t.status));
    tb.append(tr);
  });
  $("#jmlTrx").textContent = data.length;
  $("#nilaiTrx").textContent = rupiah(data.reduce((s, t) => s + angka(t.total), 0));
}

/* ===== Jalankan sesuai halaman ===== */
if (halaman === "login" || user) ({ login: initLogin, dashboard: initDashboard, stok: initStok, checkout: initCheckout, tracking: initTracking, riwayat: initRiwayat })[halaman]();
