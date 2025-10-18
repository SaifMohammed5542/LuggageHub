import { render, screen, fireEvent, act } from "@testing-library/react";
import * as nextNavigation from "next/navigation";
import Banner from "./Banner";

// ----- If you DID NOT put these in jest.setup.js, uncomment these quick mocks -----
// jest.mock('next/image', () => (props) => <img {...props} />);
// jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));

/** Helpers */
const setViewport = (width) => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  window.dispatchEvent(new Event("resize"));
};

const setScrollY = (y) => {
  Object.defineProperty(window, "scrollY", { configurable: true, value: y });
  window.dispatchEvent(new Event("scroll"));
};

describe("Banner Component", () => {
  beforeEach(() => {
    // fresh router mock for each test
    jest.spyOn(nextNavigation, "useRouter").mockReturnValue({
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
    });

    // clean fetch mocks
    global.fetch = undefined;

    // stub scrollTo (jsdom)
    window.scrollTo = jest.fn();

    // default geolocation stub (will be overridden in specific tests)
    if (!window.navigator.geolocation) {
      // @ts-ignore
      window.navigator.geolocation = {};
    }
    window.navigator.geolocation.getCurrentPosition = (_success, error) =>
      error?.({ code: 1, message: "blocked" });

    // avoid noisy alerts in output
    jest.spyOn(window, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it("renders all key texts", () => {
    render(<Banner />);

    // Main hero text
    expect(screen.getByText(/Secure Your/i)).toBeInTheDocument();
    expect(screen.getByText(/Luggage/i)).toBeInTheDocument();
    expect(screen.getByText(/Anywhere/i)).toBeInTheDocument();

    // Badge + subtitle
    expect(screen.getByText(/New • Faster • Safer/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Instantly find secure storage near you/i)
    ).toBeInTheDocument();

    // Right column feature headings
    expect(screen.getByText(/24\/7 Secure Storage/i)).toBeInTheDocument();
    expect(screen.getByText(/Verified partners/i)).toBeInTheDocument();
    expect(screen.getByText(/Walkable locations/i)).toBeInTheDocument();
    expect(screen.getByText(/Instant confirm/i)).toBeInTheDocument();
  });

  it("navigates to correct routes via CTAs", () => {
    const router = nextNavigation.useRouter();
    render(<Banner />);

    fireEvent.click(screen.getByRole("button", { name: /Find & Book/i }));
    expect(router.push).toHaveBeenCalledWith("/map-booking");

    fireEvent.click(screen.getByRole("button", { name: /Book Now/i }));
    expect(router.push).toHaveBeenCalledWith("/booking-form");

    fireEvent.click(screen.getByRole("button", { name: /Drop Your Key/i }));
    expect(router.push).toHaveBeenCalledWith("/key-handover");
  });

  it("shows scroll-to-top button after scroll and calls window.scrollTo", () => {
    const { container } = render(<Banner />);

    // Initially hidden
    expect(container.querySelector("button.scrollTop")).not.toBeInTheDocument();

    // Simulate scroll beyond threshold (300)
    setScrollY(350);

    const scrollTopBtn = container.querySelector("button.scrollTop");
    expect(scrollTopBtn).toBeInTheDocument();

    fireEvent.click(scrollTopBtn);
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });

  it("Directions to Nearest: when geolocation + fetch succeed, stations render", async () => {
    // 1) Mock geolocation success
    window.navigator.geolocation.getCurrentPosition = (success) =>
      success({ coords: { latitude: 11.11, longitude: 22.22 } });

    // 2) Mock fetch result
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { _id: "1", name: "Locker A", location: "Main St" },
        { _id: "2", name: "Locker B", location: "2nd Ave" },
      ],
    });

    render(<Banner />);

    // Click nearest button
    fireEvent.click(
      screen.getByRole("button", { name: /Directions to Nearest/i })
    );

    // Wait for station names to appear
    expect(await screen.findByText("Locker A")).toBeInTheDocument();
    expect(screen.getByText("Locker B")).toBeInTheDocument();

    // And a Directions button exists for each station
    const directionButtons = screen.getAllByRole("button", { name: /Directions/i });
    expect(directionButtons.length).toBeGreaterThanOrEqual(2);
  });

  it("Directions to Nearest: handles geolocation error gracefully (alerts)", () => {
    // Force error path
    const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});
    window.navigator.geolocation.getCurrentPosition = (_success, error) =>
      error?.({ code: 1, message: "denied" });

    render(<Banner />);

    fireEvent.click(
      screen.getByRole("button", { name: /Directions to Nearest/i })
    );

    expect(alertSpy).toHaveBeenCalled(); // basic check the error path ran
  });

  describe("Responsiveness (sanity: core content and CTAs present at common widths)", () => {
    const widths = [1440, 1024, 768, 480];

    it.each(widths)("keeps content & CTAs visible at width %ipx", (w) => {
      setViewport(w);
      render(<Banner />);

      // Core hero copy remains
      expect(screen.getByText(/Secure Your/i)).toBeInTheDocument();
      expect(screen.getByText(/Anywhere/i)).toBeInTheDocument();

      // CTAs remain actionable
      expect(screen.getByRole("button", { name: /Find & Book/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Book Now/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Drop Your Key/i })).toBeInTheDocument();
    });
  });
});
